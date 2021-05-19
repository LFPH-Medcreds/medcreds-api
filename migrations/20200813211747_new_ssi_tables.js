exports.up = async (knex) => {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  if (!(await knex.schema.hasTable('agency_connections'))) {
    await knex.schema.createTable('agency_connections', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      t.integer('org_id');
      t.foreign('org_id').references('id').inTable('organizations');
      t.integer('user_id');
      t.foreign('user_id').references('id').inTable('users');
      t.string('name');
      t.string('avatar');
      t.string('connection_id'); // Trinsic UUID
      t.json('config');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('agency_credentials'))) {
    await knex.schema.createTable('agency_credentials', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      t.integer('org_id');
      t.foreign('org_id').references('id').inTable('organizations');
      t.integer('user_id'); // for purpose of patient <- agency -> patient
      t.foreign('user_id').references('id').inTable('users');
      t.string('credential_id'); // Trinsic UUID
      t.string('schemaName'); // to make our selection of templates easier
      t.string('schemaVersion'); // with the above making selection of right schemaId
      t.json('config');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('agency_verifications'))) {
    await knex.schema.createTable('agency_verifications', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      t.integer('org_id');
      t.foreign('org_id').references('id').inTable('organizations');
      t.integer('user_id'); // for purpose of patient <- agency -> patient
      t.foreign('user_id').references('id').inTable('users');
      t.string('verification_id'); // Trinsic UUID
      t.string('policyName'); // to make our selection of templates easier
      t.string('policyVersion'); // with the above making selection of right policyId
      t.json('config'); // drop to store future helpful metadata?
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('wallet_connections'))) {
    await knex.schema.createTable('wallet_connections', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      t.integer('org_id');
      t.foreign('org_id').references('id').inTable('organizations');
      t.integer('user_id'); // for purpose of holder holding
      t.foreign('user_id').references('id').inTable('users');
      t.string('connection_id'); // Trinsic UUID
      t.json('config');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('wallet_credentials'))) {
    await knex.schema.createTable('wallet_credentials', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      t.integer('org_id');
      t.foreign('org_id').references('id').inTable('organizations');
      t.integer('user_id'); // for purpose of holder holding
      t.foreign('user_id').references('id').inTable('users');
      t.string('credential_id'); // Trinsic UUID
      t.string('schemaName'); // to make our selection of templates easier
      t.string('schemaVersion'); // with the above making selection of right schemaId
      t.json('config');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('wallet_verifications'))) {
    await knex.schema.createTable('wallet_verifications', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      t.integer('org_id'); // perhaps save? or perhpas not since we will always issue custodial using MedCreds.com root keys
      t.foreign('org_id').references('id').inTable('organizations');
      t.integer('user_id'); // for purpose of holder holding
      t.foreign('user_id').references('id').inTable('users');
      t.string('verification_id'); // Trinsic UUID
      t.string('policyName'); // to make our selection of templates easier
      t.string('policyVersion'); // with the above making selection of right policyId
      t.json('config'); // drop to store future helpful metadata?            t.timestamp('updated_at')
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasTable('agency_connections')) await knex.schema.dropTable('agency_connections');
  if (await knex.schema.hasTable('agency_credentials')) await knex.schema.dropTable('agency_credentials');
  if (await knex.schema.hasTable('agency_verifications')) await knex.schema.dropTable('agency_verifications');

  if (await knex.schema.hasTable('wallet_connections')) await knex.schema.dropTable('wallet_connections');
  if (await knex.schema.hasTable('wallet_credentials')) await knex.schema.dropTable('wallet_credentials');
  if (await knex.schema.hasTable('wallet_verifications')) await knex.schema.dropTable('wallet_verifications');
};
