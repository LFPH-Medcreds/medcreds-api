exports.up = async (knex) => {
  if (!(await knex.schema.hasTable('metrics'))) {
    await knex.schema.createTable('metrics', (t) => {
      t.increments('metric_id').unsigned().unique().primary();
      t.string('org_id');
      t.string('category');
      t.string('file_name');
      t.string('function_name');
      t.string('event_name');
      t.string('description');
      t.json('payload');
      t.timestamp('timestamp').defaultTo(knex.fn.now());
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasTable('metrics')) await knex.schema.dropTable('metrics');
};
