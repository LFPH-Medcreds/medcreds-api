const { WalletServiceClient, Credentials } = require('@trinsic/service-clients');
const { STREETCRED_API_KEY, STREETCRED_SUBSCRIPTION_ID } = require('../../config');
const client = new WalletServiceClient(new Credentials(STREETCRED_API_KEY, STREETCRED_SUBSCRIPTION_ID));

const { User, Organization, Event } = require('../../models');

/**
 * @description Lists the credentials
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/ListCredentials
 */
async function listCredentials(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId, walletId, connectionId } = ctx.params;

  if (hostOrgId && walletId && connectionId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) =>
      custody.listCredentials(walletId)
    );

    const org = await Organization.query().findOne({
      id: hostOrgId
    });
    // const event = credentials && credentials.listCredentials && await Event.query().findOne({
    //   type: 'listCredentials succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

/**
 * @description Lists the credentials for a connection identifier.
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/ListCredentials
 */
async function listCredentialsForConnectionId(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId, walletId, connectionId } = ctx.params;

  if (hostOrgId && walletId && connectionId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) =>
      custody.listCredentialsForConnectionId(walletId, connectionId)
    );

    const org = await Organization.query().findOne({
      id: hostOrgId
    });
    // const event = credentials && credentials.listCredentialsForConnectionId && await Event.query().findOne({
    //   type: 'listCredentialsForConnectionId succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

/**
 * @description Retrieve the credential details for the given {credentialId}
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/GetCredential
 */
async function getCredential(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId, walletId, credentialId } = ctx.params;

  if (hostOrgId && walletId && credentialId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) =>
      custody.getCredential(walletId, credentialId)
    );

    const org = await Organization.query().findOne({
      id: hostOrgId
    });
    // const event = credentials && credentials.getCredential && await Event.query().findOne({
    //   type: 'getCredential succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

/**
 * @description Accepts the credential offer.
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/AcceptCredentialOffer
 */
async function acceptCredentialOffer(ctx, next) {
  const { hostOrgId, walletId, credentialId } = ctx.params;

  if (hostOrgId && walletId && credentialId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) =>
      custody.acceptCredentialOffer(walletId, credentialId)
    );

    await ctx.$metrics.log('credential accepted', {
      fileName: __file,
      lineNumber: __line,
      user: { id: ctx.session.user.id },
      org: { id: hostOrgId },
      payload: {
        credentialId,
        walletId
      }
    });
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

module.exports = {
  listCredentials,
  listCredentialsForConnectionId,
  getCredential,
  acceptCredentialOffer
};
