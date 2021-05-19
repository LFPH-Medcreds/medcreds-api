const { Credentials, CredentialsServiceClient } = require('@trinsic/service-clients');

const {
  Test,
  User,
  Organization,
  Event,
  TestState,
  OrgConnections,
  AgencyConnection,
  WalletConnection
} = require('../../models');

/**
 * @description Request a connection invitation to be generated for a user
 * @date 2020-04-04
 * @see https://docs.streetcred.id/agency#operation/CreateConnection
 */
async function makeConnection(ctx, next) {
  Test.knex(ctx.psql);
  User.knex(ctx.psql);
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);
  TestState.knex(ctx.psql);
  OrgConnections.knex(ctx.psql);
  AgencyConnection.knex(ctx.psql);
  WalletConnection.knex(ctx.psql);

  const { ensureConnected } = require('../../services/identity')(ctx.psql);
  
  const { id } = ctx.session.user;
  const { hostOrgId } = ctx.request.body;

  const user = await User.query()
    .where({ id })
    .withGraphFetched('[wallets]')
    .first();
  
  const walletId = user?.wallets?.length && user.wallets[user.wallets.length - 1].walletId;
  if (!walletId) {
    ctx.throw(500);
  }
  
  const connections = await ensureConnected(user.id, walletId, hostOrgId, ctx);
  ctx.body = connections;
}

/**
 * @description Gets a list of currently connected agents
 * @date 2020-04-04
 * @see https://docs.streetcred.id/agency#operation/ListConnections
 */
async function listConnections(ctx, next) {
  ctx.log(ctx);
  if (undefined === ctx) {
    // NOTES: Standard return if not called from external
    return client.listConnections({
      state: 'Connected'
    });
  } else {
    ctx.body = await client.listConnections({
      state: 'Connected'
    });
  }
}

/**
 * @description Get the details of a connection (including invitation details).
 * @date 2020-05-12
 * @see https://docs.streetcred.id/agency#operation/GetConnection
 */
async function getConnection(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId, connectionId } = ctx.params;

  if (hostOrgId && connectionId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ agency }) =>
      agency.getConnection(connectionId)
    );

    const org = await Organization.query().findOne({
      id: hostOrgId
    });
    // const event = connection && connection.getConnection && await Event.query().findOne({
    //   type: 'getConnection succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

/**
 * @description Delete a connection record
 * @date 2020-05-12
 * @see https://docs.streetcred.id/agency#operation/DeleteConnection
 */
async function deleteConnection(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId, connectionId } = ctx.params;

  if (hostOrgId && connectionId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ agency }) =>
      agency.deleteConnection(connectionId)
    );

    const org = await Organization.query().findOne({
      id: hostOrgId
    });
    // const event = connection && connection.deleteConnection && await Event.query().findOne({
    //   type: 'deleteConnection succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

module.exports = {
  listConnections,
  makeConnection,
  getConnection,
  deleteConnection
};
