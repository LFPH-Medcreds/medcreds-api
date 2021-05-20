// IMPORTS
//
const errorHandler = require('koa-better-error-handler');
const Koa = require('koa');
const Router = require('koa-router');
const koa404Handler = require('koa-404-handler');
const logger = require('koa-logger');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const debuggingHandler = require('./middlewares/debugging');
const knex = require('knex');
const axios = require('axios');
const crypto = require('crypto');
const userAgent = require('koa2-useragent');
const { knexSnakeCaseMappers } = require('objection');
const Redis = require('ioredis');
const helmet = require('koa-helmet');
const redisStore = require('koa-redis');
const conditional = require('koa-conditional-get');
const etag = require('koa-etag');
const session = require('koa-generic-session');

const {
  DATABASE_URL,
  PG_OPTIONS,
  ZOOM_JWT,
  REDIS_HOST,
  DISABLE_REQUEST_LOGGING,
  REDIS_LOGGING_ENABLED,
  SESSION_LOGGING_ENABLED
} = require('./config');

// INSTANTIATE APPLICATION
//
const app = new Koa({
  proxy: true // so X-Forwarded-Headers are used
});

app.keys = ['verifier!@#', 'issuer!@#', 'holder!@#'];

// override koa's undocumented error handler
app.context.onerror = errorHandler;

// specify that this is our api so that koa-better-error-handler gives text instead of html
app.context.api = true;

// use koa-404-handler
app.use(koa404Handler);

const router = new Router();

// STANDARD MIDDLEWARES FOR SECURITY, ETC
//
// Logging requests
app.use(debuggingHandler);

if (!DISABLE_REQUEST_LOGGING) {
  app.use(logger()); // help us with logging
}

app.use(
  bodyParser({
    extendTypes: {
      // needed for Flutter to easily speak to API
      json: ['application/x-javascript']
      // eventsource: ['text/event-stream']
    }
  })
);

app.use(
  helmet({
    hsts: false
  })
);

app.use(userAgent());

app.use(
  cors({
    // origin: '*',
    // credentials: true,
    exposeHeaders: ['Access-Control-Allow-Origin', 'ETag'],
    origin: (ctx) => {
      const { origin } = ctx.request.header;
      if (origin) {
        const patterns = [
          /^https?:\/\/(.+\.)?mymedcreds.com$/,
          /^https?:\/\/(.+\.)?medcreds.com$/,
          /^https?:\/\/(.+\.)staging.medcreds.com$/,
          /^https?:\/\/(.+\.)dev.medcreds.com$/,
          /^https?:\/\/(.+\.)dev-ci.medcreds.com$/,
          /^https?:\/\/localhost:\d+$/,
          /^https?:\/\/deploy-preview-\d+--portal-mymedcreds.netlify.app$/
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

app.use(conditional());
app.use(etag());

// random code generators
const randTokenGen = require('rand-token').generator({
  chars: 'A-Z',
  source: crypto.randomBytes
});

const nonseGen = require('rand-token').generator({
  chars: 'default',
  source: crypto.randomBytes
});

const rand2fa = require('rand-token').generator({
  chars: '0-9',
  source: crypto.randomBytes
});

const murmur = require('murmurhash-js');
const fake_2fa_seed = process.env.FAKE_2FA_SEED ? Number(process.env.FAKE_2FA_SEED) : 0;
const twoFactorTokenGen = (ctx, email, length) => {
  const nonse = nonseGen.generate(18);

  if (email.toLowerCase().match(/7smew\.[a-zA-Z0-9]*@inbox.testmail.app/i)) {
    let token = (Math.abs(murmur.murmur3(email, fake_2fa_seed)) % Math.pow(10, length))
      .toString()
      .padStart(length, '0');

    ctx.warn(`Fake 2FA token ${token} generated for user "${email}".`);
    return { token: token, nonse: nonse, isFake: true };
  } else {
    return { token: rand2fa.generate(length), nonse: nonse, isFake: false };
  }
};

// register own middleware
app.use(async (ctx, next) => {
  ctx.randtoken = randTokenGen;
  ctx.generate_2fa_token = (email, length) => twoFactorTokenGen(ctx, email, length);

  await next();
});

const redis = new Redis({
  host: REDIS_HOST,
  maxRetriesPerRequest: 2,
  reconnectOnError: ({ message }) => {
    if (message.includes('READONLY')) return true;
  }
});

redis.on('error', (e) => {
  console.error('redis error', e);
});

if (REDIS_LOGGING_ENABLED) {
  redis.on('ready', () => {
    console.log('redis ready');
  });
  redis.on('connect', () => {
    console.log('redis connected');
  });
  redis.on('reconnecting', () => {
    console.log('redis reconnecting');
  });
  redis.on('close', () => {
    console.log('redis close');
  });
  redis.on('end', () => {
    console.log('redis end');
  });
}

app.context.redis = redis;

const oneHour = 60 * 60 * 1000;
const oneDay = oneHour * 24;
const oneMonth = oneDay * 30;

// this hacky stuff is need to dev on localStorage, i.e. not passing any domain value
const sessConfig = {
  key: 'medcreds1.sess',
  rolling: true,
  ttl: oneMonth,
  store: redisStore({ client: redis }),
  cookie: {
    httpOnly: true,
    overwrite: true,
    maxAge: oneMonth,
    // TODO: remove when no-domain is confirmed to solve out cookie issues
    // domain: process.env.SERVICE_DOMAIN ? process.env.SERVICE_DOMAIN : "localhost",
    secure: !!process.env.SERVICE_DOMAIN,
    signed: !!process.env.SERVICE_DOMAIN
  }
};

app.use(session(sessConfig));

// API CONNECTIONS
//
app.context.$sender = require('./services/sender');
// deprecated
app.context.sender = app.context.$sender;

app.context.mailgun = require('./services/mailgun');

// DATABASE CONNECTIONS
//
const psql = knex({
  client: 'pg',
  connection: `${DATABASE_URL}${PG_OPTIONS}`,
  ...knexSnakeCaseMappers()
});

app.context.psql = psql;

// register street-cred access.

const streetCred = require('./services/streetcred')(psql);
app.use(async (ctx, next) => {
  const withOrg = async (orgId, doIt) => ctx.monitor('Trinsic Call', streetCred.withOrg, orgId, doIt);
  const withRootOrg = async (doIt) => ctx.monitor('Trinsic Call', streetCred.withRootOrg, doIt);

  ctx.$streetcred = { ...streetCred, withOrg, withRootOrg };
  ctx.streetcred = ctx.$streetcred;
  ctx.trinsic = ctx.$streetcred;

  await next();
});

app.context.$google = require('./services/google');

app.context.$metrics = require('./services/metrics')(psql);

app.context.$withers = require('./services/withers');

const { isAuthorized } = require('./services/roles');
app.context.isAuthorized = isAuthorized;

// INSTANTIATE ROUTERS WITH DATABASE CONNECTIONS
//
app.use(require('./routes/health')({ psql }).routes());
app.use(require('./routes/tests')({ psql, knex }).routes());
app.use(require('./routes/auth')({ psql }).routes());
app.use(require('./routes/webhooks')({ psql, knex }).routes());


// anything above this will won't require a valid session
app.use(async (ctx, next) => {
  const { user } = ctx.session;
  if (SESSION_LOGGING_ENABLED) {
    console.log(ctx.traceId, 'session', user);
  }
  if (user && user.id && user.roles) {
    await next();
  } else {
    if (SESSION_LOGGING_ENABLED) {
      console.error(ctx.traceId, 'missing session 401');
    }
    ctx.session = null;
    ctx.throw(401);
  }
});

// anything below this will require a valid JWT to access
app.use(require('./routes/metrics')({ psql }).routes());
app.use(require('./routes/user')({ psql, knex, redis }).routes());
app.use(require('./routes/ssi')().routes());
app.use(require('./routes/organization')({ psql, knex }).routes());
app.use(require('./routes/verification')({ psql, redis }).routes());

app.use(router.routes());
app.use(router.allowedMethods());

module.exports = app;
