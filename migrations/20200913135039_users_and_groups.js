exports.up = async (knex) => {
  if (!(await knex.schema.hasTable('users_friends'))) {
    await knex.schema.createTable('users_friends', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.integer('user_id');
      t.foreign('user_id').references('id').inTable('users');
      t.integer('friend_id');
      t.foreign('friend_id').references('id').inTable('users');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('groups'))) {
    await knex.schema.createTable('groups', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.string('name').unique();
      t.string('description');
      t.integer('org_id');
      t.foreign('org_id').references('id').inTable('organizations');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('groups_users'))) {
    await knex.schema.createTable('groups_users', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.integer('group_id');
      t.foreign('group_id').references('id').inTable('groups');
      t.integer('user_id');
      t.foreign('user_id').references('id').inTable('users');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
};

exports.down = function (knex) {};
