exports.up = async (knex) => {
  await knex.schema.renameTable('org_connections', 'organizations_connections');

  await knex.schema.createTable('users_connections', (t) => {
    t.string('connection_id').unique().primary();
    t.integer('user_id');
    t.foreign('user_id').references('id').inTable('users');
    t.integer('org_id');
    t.foreign('org_id').references('id').inTable('organizations');
    t.string('name');
    t.timestamp('created_at_utc').defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('organizations_credentials', (t) => {
    t.string('credential_id');
    t.integer('org_id');
    t.foreign('org_id').references('id').inTable('organizations');
    t.string('connection_id');
    t.foreign('connection_id').references('connection_id').inTable('organizations_connections');
    t.string('schema_id');
    t.timestamp('created_at_utc').defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('users_credentials', (t) => {
    t.string('credential_id');
    t.integer('user_id');
    t.foreign('user_id').references('id').inTable('users');
    t.string('connection_id');
    t.foreign('connection_id').references('connection_id').inTable('users_connections');
    t.string('schema_id');
    t.timestamp('created_at_utc').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  if (await knex.schema.hasTable('organizations_credentials')) {
    await knex.schema.dropTable('organizations_credentials');
  }
  if (await knex.schema.hasTable('users_credentials')) {
    await knex.schema.dropTable('users_credentials');
  }
  if (await knex.schema.hasTable('users_connections')) {
    await knex.schema.dropTable('users_connections');
  }
  if (await knex.schema.hasTable('organizations_connections')) {
    await knex.schema.renameTable('organizations_connections', 'org_connections');
  }
};
