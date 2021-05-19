exports.up = async (knex) => {
  if (!(await knex.schema.hasTable('organizations_tests'))) {
    await knex.schema.createTable('organizations_tests', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.integer('organization_id').notNullable();
      t.integer('test_id').notNullable();
      t.foreign('organization_id').references('id').inTable('organizations');
      t.foreign('test_id').references('id').inTable('tests');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasTable('organizations_tests')) await knex.schema.dropTable('organizations_tests');
};
