exports.up = async (knex) => {
  if (!(await knex.schema.hasColumn('tests', 'credential'))) {
    await knex.schema.table('tests', (t) => {
      t.json('credential').notNull().default({});
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasColumn('tests', 'credential'))
    await knex.schema.table('tests', (t) => t.dropColumn('credential'));
};
