exports.up = async (knex) => {
  if (!(await knex.schema.hasColumn('organizations', 'config'))) {
    await knex.schema.table('organizations', (t) => {
      t.json('config').notNull().default({});
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasColumn('organizations', 'config'))
    await knex.schema.table('organizations', (t) => t.dropColumn('config'));
};
