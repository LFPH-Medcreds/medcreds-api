exports.up = async (knex) => {
  if (!(await knex.schema.hasColumn('organizations', 'network_name'))) {
    await knex.schema.table('organizations', (t) => {
      t.string('network_name');
    });
  }

  let [{ count }] = await knex('roles').count();
  if (count == 0) {
    for (const name of ['root', 'patient', 'doctor', 'verifier']) {
      await knex('roles').insert({ name });
    }
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasColumn('organizations', 'network_name'))
    await knex.schema.table('organizations', (t) => t.dropColumn('network_name'));
};
