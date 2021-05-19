exports.up = async (knex) => {
  if (!(await knex.schema.hasTable('organizations_events'))) {
    await knex.schema.createTable('organizations_events', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.integer('organization_id').notNullable();
      t.integer('event_id').notNullable();
      t.json('payload');
      t.foreign('organization_id').references('id').inTable('organizations');
      t.foreign('event_id').references('id').inTable('events');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasTable('organizations_events')) await knex.schema.dropTable('organizations_events');
};
