async function dropEm(knex) {
  if (await knex.schema.hasTable('users_events')) {
    await knex.schema.dropTable('users_events');
  }
  if (await knex.schema.hasTable('tests_events')) {
    await knex.schema.dropTable('tests_events');
  }
  if (await knex.schema.hasTable('organizations_events')) {
    await knex.schema.dropTable('organizations_events');
  }
  if (await knex.schema.hasTable('events')) {
    await knex.schema.dropTable('events');
  }
}

exports.up = async (knex) => {
  await knex.schema.createTable('global_events', (t) => {
    t.increments('id').unsigned().unique().primary();
    t.string('type').notNullable();
    t.json('payload');
    t.integer('user_id');
    t.integer('org_id');
    t.string('file_name');
    t.string('function_name');
    t.integer('line_number');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  if (await knex.schema.hasTable('users_events')) {
    await knex.raw(
      'insert into global_events (type,payload,user_id,created_at) select type, ue.payload, ue.user_id, ue.created_at from users_events ue join events e on ue.event_id = e.id'
    );
  }

  await dropEm(knex);
  await knex.schema.renameTable('global_events', 'events');
  await knex.schema.table('events', (t) => {
    t.foreign('user_id').references('id').inTable('users');
    t.foreign('org_id').references('id').inTable('organizations');
    t.index(['created_at', 'org_id', 'type']);
  });
};

exports.down = async (knex) => {
  if (await knex.schema.hasColumn('events', 'org_id')) {
    await knex.schema.table('events', async (t) => {
      t.dropColumn('org_id');
    });
  }
  if (await knex.schema.hasColumn('events', 'user_id')) {
    await knex.schema.table('events', async (t) => {
      t.dropColumn('user_id');
    });
  }
};
