const { User, Organization, Role, Event, Test, TestState, Meeting } = require('../../models');
const bcrypt = require('bcrypt');
const { randtoken } = require('../../util');

const {
  MCN_API_KEY,
  MCN_SUB_KEY,
  MCN_TENANT_ID,
  GAGD_API_KEY,
  GAGD_SUB_KEY,
  GAGD_TENANT_ID
} = require('../../config');

exports.seed = async (knex) => {
  // User.knex(knex)
  // Role.knex(knex)
  // Event.knex(knex)
  // Test.knex(knex)
  // TestState.knex(knex)
  // Meeting.knex(knex)
  // Organization.knex(knex)
  // process.stdout.write('starting seed of MedCreds Production data \n')
  // const organizations = [
  //     {
  //         name: 'MedCreds Network',
  //         roles: [ 'root' ],
  //         config: {
  //             streetcred: {
  //                 tenantId: MCN_API_KEY,
  //                 apiKey: MCN_SUB_KEY,
  //                 subscriptionId: MCN_TENANT_ID
  //             }
  //         }
  //     }
  // ]
  // for await (let org of organizations) {
  //     const exists = await Organization.query().findOne({ name: org.name })
  //     if (exists) {
  //         continue
  //     }
  //     const { name, config } = org
  //     let saved = await Organization.query().insertAndFetch({ name, config })
  //     for (let role of org.roles) {
  //         role = await Role.query().where({ name: role }).first()
  //         await saved.$relatedQuery('roles').relate(role)
  //     }
  // }
  // const users = [
  //     {
  //         name: 'Phillip Launch',
  //         email: 'phillip+root@proofmarket.io',
  //         roles: [ 'root' ]
  //     },
  //     {
  //         name: 'Tony Launch',
  //         email: 'tony+root@proofmarket.io',
  //         roles: [ 'root' ]
  //     },
  //     {
  //         name: 'Chris Launch',
  //         email: 'chris+root@proofmarket.io',
  //         roles: [ 'root' ]
  //     },
  //     {
  //         name: 'Gary Launch',
  //         email: 'gary+root@proofmarket.io',
  //         roles: [ 'root' ]
  //     },
  //     {
  //         name: 'Alex Launch',
  //         email: 'alex+root@proofmarket.io',
  //         roles: [ 'root' ]
  //     },
  //     {
  //         name: 'Dorin Launch',
  //         email: 'dorin+root@proofmarket.io',
  //         roles: [ 'root' ]
  //     },
  //     {
  //         name: 'Sumiran Launch',
  //         email: 'sumiran+root@proofmarket.io',
  //         roles: [ 'root' ]
  //     }
  // ]
  // for await (let user of users) {
  //     let password = 'm3dcr3ds!!'
  //     password = bcrypt.hashSync(password, 10)
  //     let { name, email } = user
  //     let roleNames = user.roles
  //     user = await User.query().findOne({ email })
  //     if (!user) {
  //         user = await User.query().insertGraph({ name, email, password })
  //         for (const roleName of roleNames) {
  //             let role = await Role.query().where({ name: roleName }).first()
  //             await user.$relatedQuery('roles').relate(role)
  //         }
  //     }
  // }
  // await require('../seedutil').testStates(knex)
  // await require('../streetcred-seed').up(knex)
};
