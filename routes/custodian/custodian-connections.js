const { User, Organization, Event } = require('../../models');

/**
 * @description Get connection by ID
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/GetConnection
 */
async function getConnection(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId, walletId, connectionId } = ctx.params;

  if (hostOrgId && walletId && connectionId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) =>
      custody.getConnection(walletId, connectionId)
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
 * @description Retrieves a list of connections that are in 'Connected' state.
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/GetConnections
 */
async function getConnections(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId, walletId } = ctx.params;

  if (hostOrgId && walletId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) =>
      custody.getConnections(walletId)
    );

    const org = await Organization.query().findOne({
      id: hostOrgId
    });
    // const event = connection && connection.getConnections && await Event.query().findOne({
    //   type: 'getConnections succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

/**
 * @description Get list of invitations.
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/GetInvitations
 */
async function getInvitations(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId, walletId } = ctx.params;

  if (hostOrgId && walletId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) =>
      custody.getInvitations(walletId)
    );

    const org = await Organization.query().findOne({
      id: hostOrgId
    });
    // const event = connection && connection.getInvitations && await Event.query().findOne({
    //   type: 'getInvitations succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

/**
 * @description Accept an invitation
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/AcceptInvitation
 */
async function acceptInvitation(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { invitation } = ctx.query.body;

  const { hostOrgId, walletId } = ctx.params;

  if (hostOrgId && walletId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) =>
      custody.acceptInvitation(walletId, invitation)
    );

    const org = await Organization.query().findOne({
      id: hostOrgId
    });
    // const event = connection && connection.acceptInvitation && await Event.query().findOne({
    //   type: 'acceptInvitation succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

module.exports = {
  getConnection,
  getConnections,
  acceptInvitation,
  getInvitations
};
