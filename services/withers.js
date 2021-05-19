const { Organization, User, Wallet } = require('../models');

const { returnIt } = require('../util');

async function withOrg(id, doIt) {
  const org = await Organization.query().withGraphFetched('[roles, parent]').findById(id);
  if (!org) {
    throw new Error(`bad org id: ${id}`);
  }
  if (doIt) return doIt(org);
  else return org;
}

async function withUser(id, doIt) {
  const user = await User.query().withGraphFetched('[roles]').findById(id);
  if (!user) {
    throw new Error(`bad user id: ${id}`);
  }
  return doIt(user);
}

module.exports = {
  withOrg,
  async withRootOrg(doIt) {
    const org = await Organization.query().joinRelated('[roles]').findOne({ 'roles.name': 'root' });
    if (!org) {
      throw new Error('no root org');
    }
    return withOrg(org.id, doIt);
  },
  async withOrgs(doIt, decorateIt = returnIt) {
    const orgs = await decorateIt(Organization.query().withGraphFetched('[roles]'));
    const promises = [];
    for (const org of orgs) {
      promises.push(Promise.resolve(doIt(org)));
    }
    return Promise.all(promises);
  },
  async withTenantId(tenantId, doIt) {
    const [{ id: orgId }] = await Organization.query()
      .select('id')
      .whereRaw(`config->'streetcred'->>'tenantId' = '${tenantId}'`);
    if (!orgId) {
      throw new Error(`bad tenant id ${tenantId}`);
    }
    return withOrg(orgId, doIt);
  },
  withUser,
  async withWalletId(walletId, doIt) {
    const [wallet] = await Wallet.query().withGraphFetched('[users]').where({ walletId });
    if (!wallet) {
      throw new Error(`bad wallet id: ${walletId}`);
    }
    return doIt(wallet);
  }
};
