const {
  Credentials,
  CredentialsServiceClient,
  ProviderServiceClient
} = require('@trinsic/service-clients');

const { STREETCRED_PROVIDER_KEY, STREETCRED_API_KEY } = require('../../config');

const client = new CredentialsServiceClient(new Credentials(STREETCRED_API_KEY));
const clientAdmin = new ProviderServiceClient(new Credentials(STREETCRED_PROVIDER_KEY));


/**
 * @description return list or orgs configured for Streetcred account
 * @date 2020-04-04
 * @returns promise
 */
async function listTenants(ctx, next) {
  const tenants = await clientAdmin.listTenants();
  ctx.body = tenants;
}

/**
 * @description Returns the agent configuration
 * @date 2020-04-04
 */
async function getTenant(ctx, next) {
  const { tenantId } = ctx.params;
  const tenant = await clientAdmin.getTenant(tenantId);
  ctx.body = tenant;
}

async function getHealth(ctx, next) {
  const result = await client.health();
  ctx.body = result;
  return ctx;
}

module.exports = {
  listTenants,
  getTenant,
  getHealth
};
