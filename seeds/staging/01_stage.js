exports.seed = async (knex) => {
  // process.stdout.write('starting seed of MedCreds Staging data \n')

  // await require('../demoseed')(knex)
  // await require('../seedutil').testStates(knex)
  // await require('../streetcred-seed').up(knex)
  await require('../roles-reseed')(knex);
};
