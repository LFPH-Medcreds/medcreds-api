exports.up = async (knex) => {
  await knex.schema.table('organizations_users', (t) => {
    t.jsonb('roles').defaultTo({ roles: [] });
  });
};

exports.down = async (knex) => {
  await knex.schema.table('organizations_users', (t) => {
    t.dropColumn('roles');
  });
};
