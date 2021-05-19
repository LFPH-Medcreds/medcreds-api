const withers = require('../services/withers');

const Streetcred = require('../services/streetcred');

exports.up = async (knex) => {
  // const streetcred = Streetcred(knex)
  // await withers.withOrgs(org => {
  //   if (!org.hasStreetcred) {
  //     return
  //   }
  //   return streetcred.provision(org)
  // })
};

exports.down = async () => {
  // foo
};
