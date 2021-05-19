exports.up = async (knex) => {
  if (!(await knex.schema.hasColumn('leads', 'message'))) {
    await knex.schema.table('leads', (t) => {
      t.string('message');
      t.json('data').default({});
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasColumn('leads', 'message')) {
    await knex.schema.table('leads', (t) => t.dropColumn('message'));
    await knex.schema.table('leads', (t) => t.dropColumn('data'));
  }
};
