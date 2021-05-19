const withers = require('../services/withers');

exports.up = async (knex) => {
  const streetcred = require('../services/streetcred')(knex);
  await withers.withOrgs((org) => {
    if (!org.hasStreetcred) {
      return;
    }
    return streetcred.provision(org);
  });
};

exports.down = async () => {
  // foo
};
