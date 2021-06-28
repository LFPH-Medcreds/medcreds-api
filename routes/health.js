const router = require('koa-router')();
const { logRoutes } = require('../src/util');
const { Credentials, CredentialsServiceClient, ProviderServiceClient } = require('@trinsic/service-clients');

const { STREETCRED_API_KEY } = require('../config');

const client = new CredentialsServiceClient(new Credentials(STREETCRED_API_KEY));

module.exports = ({ psql }) => {
  router.get('/health/streetcred', getHealth);
  router.get('/health', healthCheck);
  router.get('/', healthCheck);
  router.get('/version', getVersion);

  async function getHealth(ctx, next) {
    const result = await client.health();
    ctx.body = result;
    return ctx;
  }

  async function healthCheck(ctx, next) {
    const [{ version }] = await psql.select(psql.raw('version()'));
    const success = Boolean(version);
    if (!success) {
      ctx.warn('DB failed health check.');
    }
    ctx.body = {
      success
    };
    ctx.status = success ? 200 : 500;
  }

  // logRoutes(router);

  return router;
};

async function getVersion(ctx) {
  ctx.body = {
    date: '2021-01-04T04:50:26.561098',
    version: '2.0.1'
  };

  ctx.status = 200;

  logRoutes(router);
  return router;
}
