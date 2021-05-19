exports.up = async (knex) => {
  await knex.schema.table('organizations_users', (t) => {
    t.unique(['organization_id', 'user_id']);
  });
  await knex.schema.table('organizations_roles', (t) => {
    t.unique(['organization_id', 'role_id']);
  });
  await knex.schema.table('users_roles', (t) => {
    t.unique(['user_id', 'role_id']);
  });
};

exports.down = async (knex) => {
  await knex.schema.table('organizations_users', (t) => {
    t.dropUnique(['organization_id', 'user_id']);
  });
  await knex.schema.table('organizations_roles', (t) => {
    t.dropUnique(['organization_id', 'role_id']);
  });
  await knex.schema.table('users_roles', (t) => {
    t.dropUnique(['user_id', 'role_id']);
  });
};
