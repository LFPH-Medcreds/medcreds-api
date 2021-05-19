const faker = require('faker');
const bcrypt = require('bcrypt');
const {
  DEMO_DOCTOR_ORG_NAME,
  DEMO_VERIFIER_ORG_NAME,
  DEMO_ROOT_ORG_NAME,
  STREETCRED_TENANT_ID,
  STREETCRED_API_KEY,
  STREETCRED_SUBSCRIPTION_ID,
  DEMO_MEDICAL_SITE_STREETCRED_API_KEY,
  DEMO_MEDICAL_SITE_STREETCRED_TENANT_ID,
  DEMO_MEDICAL_SITE_STREETCRED_SUBSCRIPTION_ID,
  DEMO_VERIFIER_STREETCRED_API_KEY,
  DEMO_VERIFIER_STREETCRED_TENANT_ID,
  DEMO_VERIFIER_STREETCRED_SUBSCRIPTION_ID,
  OTHER_DEMO_DOCTOR_ORG_NAME
} = require('../config');

const { User, Organization, Role, Event, Test, TestState, Meeting } = require('../models');

module.exports = async (knex) => {
  User.knex(knex);
  Role.knex(knex);
  Event.knex(knex);
  Test.knex(knex);
  TestState.knex(knex);
  Meeting.knex(knex);
  Organization.knex(knex);

  process.stdout.write('starting seed of MedCreds Demo data \n');

  const names = ['phillip', 'gary', 'dorin', 'chris', 'tony', 'jenny', 'zack', 'steve', 'alex'];
  const roles = ['admin', 'holder', 'verifier', 'issuer'];
  const doctorOrgName = DEMO_DOCTOR_ORG_NAME;
  const verifierOrgName = DEMO_VERIFIER_ORG_NAME;
  const organizations = [
    {
      name: DEMO_ROOT_ORG_NAME,
      roles: ['root'],
      config: {
        streetcred: {
          tenantId: STREETCRED_TENANT_ID,
          apiKey: STREETCRED_API_KEY,
          subscriptionId: STREETCRED_SUBSCRIPTION_ID
        }
      }
    },
    {
      name: doctorOrgName,
      roles: ['doctor'],
      config: {
        streetcred: {
          tenantId: DEMO_MEDICAL_SITE_STREETCRED_TENANT_ID,
          apiKey: DEMO_MEDICAL_SITE_STREETCRED_API_KEY,
          subscriptionId: DEMO_MEDICAL_SITE_STREETCRED_SUBSCRIPTION_ID
        }
      }
    },
    {
      name: OTHER_DEMO_DOCTOR_ORG_NAME,
      roles: ['doctor'],
      config: {}
    },
    {
      name: verifierOrgName,
      roles: ['verifier'],
      config: {
        streetcred: {
          tenantId: DEMO_VERIFIER_STREETCRED_TENANT_ID,
          apiKey: DEMO_VERIFIER_STREETCRED_API_KEY,
          subscriptionId: DEMO_VERIFIER_STREETCRED_SUBSCRIPTION_ID
        }
      }
    },
    {
      name: 'MikeyCo',
      roles: ['verifier'],
      config: {}
    }
  ];

  for await (let org of organizations) {
    const { name, config } = org;
    let saved = await Organization.query().insertAndFetch({ name, config });
    for (let role of org.roles) {
      role = await Role.query().where({ name: role }).first();
      await saved.$relatedQuery('roles').relate(role);
    }
  }

  for await (const roleName of roles) {
    const password = bcrypt.hashSync(roleName, 10);
    for await (const name of names) {
      const email = `${name}+${roleName}@proofmarket.io`;
      const upperFirst = name.charAt(0).toUpperCase() + name.slice(1);
      const fullName = `${upperFirst} ${faker.name.lastName()}`;
      const user = await User.query().insertGraph({
        name: fullName,
        email,
        password
      });
      let role = await Role.query().where({ name: roleName }).first();
      await user.$relatedQuery('roles').relate(role);

      if (roleName == 'patient' || roleName == 'doctor') {
        const org = await Organization.query().where({ name: doctorOrgName }).first();
        await user.$relatedQuery('organizations').relate(org);
      }
    }
  }

  // Add each verifier user to GaryCo
  const garyCo = await Organization.query().findOne({ name: verifierOrgName });
  for (const name of names) {
    let user = await User.query().findOne({ email: `${name}@verifier.com` });
    await user.$relatedQuery('organizations').relate(garyCo);
  }
};
