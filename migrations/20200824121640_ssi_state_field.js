exports.up = async (knex) => {
  await knex.schema.table('users', (t) => t.string('phone').nullable());
  await knex.schema.table('agency_connections', (t) => t.string('state').nullable());
  await knex.schema.table('agency_credentials', (t) => t.string('state').nullable());
  await knex.schema.table('agency_verifications', (t) => t.string('state').nullable());
  await knex.schema.table('wallet_connections', (t) => t.string('state').nullable());
  await knex.schema.table('wallet_credentials', (t) => t.string('state').nullable());
  await knex.schema.table('wallet_verifications', (t) => t.string('state').nullable());
};

exports.down = async (knex) => {
  await knex.schema.table('users', (t) => t.dropColumn('phone'));
  await knex.schema.table('agency_connections', (t) => t.dropColumn('state'));
  await knex.schema.table('agency_credentials', (t) => t.dropColumn('state'));
  await knex.schema.table('agency_verifications', (t) => t.dropColumn('state'));
  await knex.schema.table('wallet_connections', (t) => t.dropColumn('state'));
  await knex.schema.table('wallet_credentials', (t) => t.dropColumn('state'));
  await knex.schema.table('wallet_verifications', (t) => t.dropColumn('state'));
};
