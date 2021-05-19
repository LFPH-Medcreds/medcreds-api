exports.up = async (knex) => {
  if (!(await knex.schema.hasTable('users_events'))) {
    await knex.schema.createTable('users_events', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.integer('user_id').notNullable();
      t.integer('event_id').notNullable();
      t.json('payload');
      t.foreign('user_id').references('id').inTable('users');
      t.foreign('event_id').references('id').inTable('events');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasTable('users_events')) await knex.schema.dropTable('users_events');
};
