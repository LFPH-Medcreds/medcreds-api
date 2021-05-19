// NOTES: test_state = one of ['new', 'observing', 'authorizing', 'completed', 'rejected', 'abandoned']
//        can ONLY be marked 'observing' or 'authorizing' by Observer
//        can be marked 'abandoned' by Patient (any time prior to 'completed') or Observer
//        can be marked 'rejected' by Observer or Authorizer
//        can ONLY be marked 'completed' by Authorizer
// NOTES: These are organizations that have signed up for to be Issuers or Verifiers
//        These should have at least 1 official contact/manager registered as an SSI user
//        The business could also have its own Agent/wallet
//        Issuers must ahve a Tenant wallet, Verifiers can be Custodial
// NOTES: The user_id is the streetcred_user_id in streetcred_callbacks

exports.up = async (knex) => {
  if (!(await knex.schema.hasTable('users'))) {
    await knex.schema.createTable('users', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.string('streetcred_user_id').unique();
      t.json('credential');
      t.json('connection');
      t.string('password');
      t.string('name');
      t.string('email').unique();
      t.string('photo');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('events'))) {
    await knex.schema.createTable('events', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.string('type');
      t.json('json'); // optional, just to give us flexibility
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('roles'))) {
    await knex.schema.createTable('roles', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.string('name').unique();
      t.string('description');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('meetings'))) {
    await knex.schema.createTable('meetings', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.json('details'); // so we can just drop the zoom blob in
      t.integer('test_id');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('test_states'))) {
    await knex.schema.createTable('test_states', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.string('state');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('tests'))) {
    await knex.schema.createTable('tests', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.string('test_ref').unique();
      t.integer('test_state_id').defaultTo(1).notNullable();
      t.foreign('test_state_id').references('id').inTable('test_states');
      t.integer('patient_id').notNullable();
      t.foreign('patient_id').references('id').inTable('users');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('organizations'))) {
    await knex.schema.createTable('organizations', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.string('name').notNullable();
      t.string('email');
      t.string('logo');
      t.string('city');
      t.string('state');
      t.string('country');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('users_meetings'))) {
    await knex.schema.createTable('users_meetings', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.integer('user_id');
      t.foreign('user_id').references('id').inTable('users');
      t.integer('meeting_id');
      t.foreign('meeting_id').references('id').inTable('meetings');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('tests_users'))) {
    await knex.schema.createTable('tests_users', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.integer('test_id');
      t.foreign('test_id').references('id').inTable('tests');
      t.integer('user_id');
      t.foreign('user_id').references('id').inTable('users');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('tests_events'))) {
    await knex.schema.createTable('tests_events', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.integer('test_id').notNullable();
      t.integer('actor_id').notNullable();
      t.integer('event_id').notNullable();
      t.json('result');
      t.foreign('test_id').references('id').inTable('tests');
      t.foreign('actor_id').references('id').inTable('users');
      t.foreign('event_id').references('id').inTable('events');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('users_roles'))) {
    await knex.schema.createTable('users_roles', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.integer('user_id');
      t.foreign('user_id').references('id').inTable('users');
      t.integer('role_id');
      t.foreign('role_id').references('id').inTable('roles');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('organizations_roles'))) {
    await knex.schema.createTable('organizations_roles', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.integer('organization_id');
      t.foreign('organization_id').references('id').inTable('organizations');
      t.integer('role_id');
      t.foreign('role_id').references('id').inTable('roles');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('organizations_users'))) {
    await knex.schema.createTable('organizations_users', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.integer('organization_id').notNullable();
      t.foreign('organization_id').references('id').inTable('organizations');
      t.integer('user_id').notNullable();
      t.foreign('user_id').references('id').inTable('users');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('streetcred_callbacks'))) {
    await knex.schema.createTable('streetcred_callbacks', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.string('correlation');
      t.string('tenant_id');
      t.string('type');
      t.json('data_object');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasTable('streetcred_callbacks')) await knex.schema.dropTable('streetcred_callbacks');
  if (await knex.schema.hasTable('organizations_users')) await knex.schema.dropTable('organizations_users');
  if (await knex.schema.hasTable('organizations_roles')) await knex.schema.dropTable('organizations_roles');
  if (await knex.schema.hasTable('users_roles')) await knex.schema.dropTable('users_roles');
  if (await knex.schema.hasTable('tests_events')) await knex.schema.dropTable('tests_events');
  if (await knex.schema.hasTable('tests_users')) await knex.schema.dropTable('tests_users');
  if (await knex.schema.hasTable('users_meetings')) await knex.schema.dropTable('users_meetings');
  if (await knex.schema.hasTable('organizations')) await knex.schema.dropTable('organizations');
  if (await knex.schema.hasTable('roles')) await knex.schema.dropTable('roles');
  if (await knex.schema.hasTable('tests')) await knex.schema.dropTable('tests');
  if (await knex.schema.hasTable('test_states')) await knex.schema.dropTable('test_states');
  if (await knex.schema.hasTable('meetings')) await knex.schema.dropTable('meetings');
  if (await knex.schema.hasTable('events')) await knex.schema.dropTable('events');
  if (await knex.schema.hasTable('users')) await knex.schema.dropTable('users');
  console.log('\ndropped all tables\n'.toUpperCase());
};
