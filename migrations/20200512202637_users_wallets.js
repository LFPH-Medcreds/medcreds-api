exports.up = async (knex) => {
  if (!(await knex.schema.hasTable('wallets'))) {
    await knex.schema.createTable('wallets', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.string('wallet_id').notNullable().defaultTo('');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
  if (!(await knex.schema.hasTable('users_wallets'))) {
    await knex.schema.createTable('users_wallets', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.integer('user_id').notNullable();
      t.integer('wallet_id').notNullable();
      t.foreign('user_id').references('id').inTable('users');
      t.foreign('wallet_id').references('id').inTable('wallets');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasTable('users_wallets')) await knex.schema.dropTable('users_wallets');
  if (await knex.schema.hasTable('wallets')) await knex.schema.dropTable('wallets');
};
