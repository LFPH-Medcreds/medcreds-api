const withers = require('../services/withers');

const sc = require('../services/streetcred');

exports.up = async (knex) => {
  const streetcred = sc(knex);
  await streetcred.withRootOrg(({ org }) => streetcred.provision(org));
  await withers.withOrgs((org) => {
    if (org.hasRole('root') || !org.hasStreetcred) {
      return;
    }
    return streetcred.provision(org);
  });
};

exports.down = async (knex) => {
  const streetcred = sc(knex);
  await streetcred.withRootOrg(({ org }) => streetcred.deprovision(org));
  await withers.withOrgs((org) => {
    if (org.hasRole('root') || !org.hasStreetcred) {
      return;
    }
    return streetcred.deprovision(org);
  });
};
