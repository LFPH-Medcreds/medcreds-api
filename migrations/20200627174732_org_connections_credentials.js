exports.up = async (knex) => {
  await knex.schema.createTable('org_connections', (t) => {
    t.string('connection_id').unique().primary();
    t.integer('user_id');
    t.foreign('user_id').references('id').inTable('users');
    t.integer('org_id');
    t.foreign('org_id').references('id').inTable('organizations');
    t.string('name');
    t.string('state');
    t.timestamp('created_at_utc').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  if (await knex.schema.hasTable('org_connections')) {
    await knex.schema.dropTable('org_connections');
  }
};
