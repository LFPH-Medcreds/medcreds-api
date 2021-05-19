exports.up = async (knex) => {
  if (await knex.schema.hasColumn('agency_credentials', 'schemaName')) {
    await knex.schema.table('agency_credentials', (t) => t.renameColumn('schemaName', 'schema_name'));
    await knex.schema.table('agency_credentials', (t) => t.renameColumn('schemaVersion', 'schema_version'));
  }

  if (await knex.schema.hasColumn('agency_verifications', 'policyName')) {
    await knex.schema.table('agency_verifications', (t) => t.renameColumn('policyName', 'policy_name'));
    await knex.schema.table('agency_verifications', (t) => t.renameColumn('policyVersion', 'policy_version'));
  }

  if (await knex.schema.hasColumn('wallet_credentials', 'schemaName')) {
    await knex.schema.table('wallet_credentials', (t) => t.renameColumn('schemaName', 'schema_name'));
    await knex.schema.table('wallet_credentials', (t) => t.renameColumn('schemaVersion', 'schema_version'));
  }

  if (await knex.schema.hasColumn('wallet_verifications', 'policyName')) {
    await knex.schema.table('wallet_verifications', (t) => t.renameColumn('policyName', 'policy_name'));
    await knex.schema.table('wallet_verifications', (t) => t.renameColumn('policyVersion', 'policy_version'));
  }
};

exports.down = async (knex) => {};
