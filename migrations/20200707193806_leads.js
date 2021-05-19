exports.up = async (knex) => {
  await knex.schema.createTable('leads', (t) => {
    t.increments('id').unsigned().unique().primary();
    t.string('first_name');
    t.string('last_name');
    t.string('email');
    t.string('phone');
    t.bool('gagd');
    t.timestamp('updated_at');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  if (await knex.schema.hasTable('leads')) {
    await knex.schema.dropTable('leads');
  }
};
