exports.seed = async (knex) => {
  await require('../demoseed')(knex)
  // await require('../seedutil').testStates(knex)
  await require('../streetcred-seed').up(knex)
  // await require('../roles-reseed')(knex)
  // await require('../connections-credentials')(knex)
};
