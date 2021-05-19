const { WalletServiceClient } = require('@trinsic/service-clients');

const { User, Organization, Event } = require('../../models');

/**
 * @description Create a new Custodian Wallet associated with the specified Organization
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/CreateWallet
 */
async function createWallet(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId } = ctx.params;

  const { ownerName } = ctx.request.body;

  const options = {
    ownerName: ownerName
  };

  if (hostOrgId && ownerName) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) => custody.createWallet(options));

    const org = await Organization.query().findOne({
      id: hostOrgId
    });

    // const event = wallet && wallet.createWallet && await Event.query().findOne({
    //   type: 'createWallet succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

/**
 * @description Lists all custodian wallets
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/ListWallets
 */
async function listWallets(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId } = ctx.params;

  if (hostOrgId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) => custody.listWallets());

    const org = await Organization.query().findOne({
      id: hostOrgId
    });
    // const event = wallets && wallets.listWallets && await Event.query().findOne({
    //   type: 'listWallets succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

/**
 * @description This will delete all connections, credentials and verification records for this user wallet.
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/DeleteWallet
 */
async function deleteWallet(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId } = ctx.params;

  const { walletId } = ctx.request.body;

  if (hostOrgId && walletId) {
    const options = {
      walletId
    };

    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) => custody.deleteWallet(options));

    const org = await Organization.query().findOne({
      id: hostOrgId
    });
    // const event = wallets && wallets.deleteWallet && await Event.query().findOne({
    //   type: 'deleteWallet succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

module.exports = {
  listWallets,
  createWallet,
  deleteWallet
};
