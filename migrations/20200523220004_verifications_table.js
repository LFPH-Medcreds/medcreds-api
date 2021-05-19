exports.up = async (knex) => {
  await knex.schema.createTable('verifications', (t) => {
    t.increments('id').unsigned().unique().primary();
    t.integer('verifier_id');
    t.integer('holder_id');
    t.integer('org_id');
    t.json('data');
    t.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  if (await knex.schema.hasTable('verifications')) {
    await knex.schema.dropTable('verifications');
  }
};
