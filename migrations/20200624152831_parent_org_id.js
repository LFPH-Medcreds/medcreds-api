exports.up = async (knex) => {
  if (!(await knex.schema.hasColumn('parent_org_id', 'organizations'))) {
    await knex.schema.table('organizations', (t) => {
      t.integer('parent_org_id');
      t.foreign('parent_org_id').references('id').inTable('organizations');
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasColumn('organizations', 'parent_org_id')) {
    await knex.schema.table('organizations', (t) => {
      t.dropForeign('parent_org_id');
      t.dropColumn('parent_org_id');
    });
  }
};
