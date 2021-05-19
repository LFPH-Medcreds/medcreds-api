const { DATABASE_URL, PG_OPTIONS } = require('../config');
const knex = require('knex');

const psql = knex({
  client: 'pg',
  connection: `${DATABASE_URL}${PG_OPTIONS}`
});

const $streetcred = require('../services/streetcred')(psql);

$streetcred.withRootOrg(async ({ agency }) => {
  (await agency.listTenants()).forEach(async (tenant) => {
    console.log(tenant.name);
    if (tenant.name == 'foo bar') {
      console.log(`deleting ${tenant.tenantId}`);
      await agency.deleteTenant(tenant.tenantId);
    }
  });
});
