const { User, Organization, Role, Event, Test, TestState, Meeting } = require('../models');

module.exports = async (knex) => {
  User.knex(knex);
  Role.knex(knex);
  Event.knex(knex);
  Test.knex(knex);
  TestState.knex(knex);
  Meeting.knex(knex);
  Organization.knex(knex);

  process.stdout.write('starting re-seed of roles \n');

  const users = await User.query().withGraphFetched('[roles, organizations]');

  for await (const user of users) {
    const orgs = user.organizations;
    let org;
    let medcredsNetwork = orgs && orgs.find((org) => org.name === 'MedCreds Network');
    if (!medcredsNetwork) {
      org = await Organization.query().findOne({ name: 'MedCreds Network' });
      await org.$relatedQuery('users').relate(user);
    } else org = medcredsNetwork;

    if (!org) console.log('orgs:', orgs);

    let roles = user.roles && user.roles.map((role) => role.name);
    if (roles.includes('patient')) roles = [];
    else roles = ['doctor', 'verifier', 'admin'];

    // await user.$relatedQuery('organizations').patch({ roles: { roles } }).where('users.id', user.id)
    await org.$relatedQuery('users').patch({ userRoles: { roles } }).where('users.email', user.email);
    console.log(user.name, 'Org: ', org.name, 'Roles: ', roles);
  }

  // we need to fetch all User.roles and assign them to the
};
