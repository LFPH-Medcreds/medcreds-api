import Koa from 'koa';
import fs from 'fs';
import koarouter from 'koa-router';
const mount = require('koa-mount')
const LogAdapter = require('./utilities/logger');
const logger = LogAdapter.getInstance("access-logs");
const koaLogger = require('koa-bunyan-logger');

// Security modules
// import jwt from 'koa-jwt';
import helmet from 'koa-helmet';
import cors from '@koa/cors';

function readdirToRouter(router, child = '') {
  const path = `${__dirname}/controllers${child ? `/${child}` : ''}`;
  fs.readdirSync(path).forEach((file) => {
    const path = file.split('.');
    const name = path[0];
    if (path.length > 1) {
      if (path[path.length - 1] === 'ts') {
        const child_path = child ? `${child}/` : '';
        let route = require(`./controllers/${child_path}${name}`);
        if( typeof route.initialize === 'function'){
          route = route.initialize();
        }
        if (name === 'index') {
          router.use(`/v1/${child}`, route.routes(), route.allowedMethods());
        } else {
          router.use(`/v1/${child_path}${name}`, route.routes(), route.allowedMethods());
        }
      }
    } else {
      readdirToRouter(router, file);
    }
  });
}

export const createApp = () => {
  const app = new Koa();
  const router = new koarouter();

  app.context.api = true;

  app.use(koaLogger(logger))
    .use(koaLogger.requestLogger(logger))
    .use(koaLogger.requestIdContext())
    .use(koaLogger.timeContext());

  app.use(helmet()).use(cors({
    exposeHeaders: ['Access-Control-Allow-Origin', 'ETag'],
    origin: (ctx) => {
      const { origin } = ctx.request.header;
      if (origin) {
        const patterns = [
          /^https?:\/\/(.+\.)?mymedcreds.com$/,
          /^https?:\/\/(.+\.)?medcreds.com$/,
          /^https?:\/\/localhost:\d+$/,
          /^https?:\/\/deploy-preview-\d+--portal-mymedcreds.netlify.app$/,
          /^https?:\/\/(.+\.)?a.run.app$/
        ];
        for (const pattern of patterns) {
          let isMatch = origin.match(pattern);
          if (isMatch) {
            return origin;
          }
        }
      }
    },
    credentials: true
  })
  );

  // This middleware just hides the detailed JWT errors.
  app.use(function (ctx, next) {
    return next().catch((err) => {
      if (401 === err.status) {
        ctx.status = 401;
        ctx.body = 'Not Authorized';
      } else {
        throw err;
      }
    });
  });

  // load the controllers
  readdirToRouter(router);

  app.use(router.routes()).use(router.allowedMethods());

  // load legacy app
  const appLegacy = require('./../app')
  app.use(mount(appLegacy))

  return app;
};
