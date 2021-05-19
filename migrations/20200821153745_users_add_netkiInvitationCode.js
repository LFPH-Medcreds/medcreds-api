exports.up = async (knex) => {
  await knex.schema.table('users', (t) => {
    t.jsonb('netki_invitation_code').nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.table('users', (t) => {
    t.dropColumn('netki_invitation_code');
  });
};
