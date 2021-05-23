const router = require('koa-router')();
const faker = require('faker');
const bcrypt = require('bcrypt');

const { listConnections } = require('../routes/ssi/agency-connections');

const { User, Callback } = require('../models');

const { DATABASE_URL } = require('../config');

const knex = require('knex')({
  client: 'pg',
  connection: DATABASE_URL
});
const { logRoutes } = require('../src/util');

module.exports = () => {
  User.knex(knex);
  Callback.knex(knex);

  router.get('/seedUsers', seedUsers);
  router.get('/initCallbacks', initCallbacks);

  async function seedUsers(ctx, next) {
    const users = [];

    ctx.log('check if table exists');

    await knex.schema.dropTableIfExists('users');

    await knex.schema.createTable('users', (t) => {
      t.increments('id').notNullable().unique().primary();
      t.string('connection_id').unique();
      t.string('credential');
      t.string('test_result');
      t.string('zoom_uri');
      t.string('name');
      t.string('password');
      t.string('email').unique();
      t.string('photo');
      t.string('role');
      t.timestamp('updated_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
    ctx.log('starting seed of users');

    const scConnections = await listConnections();

    const password = bcrypt.hashSync('password', 10);

    for await (const record of scConnections) {
      ctx.log(record);
      const {
        connectionId,
        name,
        myDid,
        theirDid,
        myKey,
        theirKey,
        state,
        invitation,
        invitationUrl,
        endpoint,
        createdAtUtc,
        multiParty
      } = record;

      const random = Math.floor(Math.random() * 100);

      let user = {
        connection_id: connectionId,
        name: `${faker.name.firstName()} ${faker.name.lastName()}`,
        email: faker.internet.email().toLowerCase(),
        role: 'patient',
        test_result: random > 35 ? 'healthy' : 'covid',
        password,
        photo: `https://api.adorable.io/avatars/280/${theirDid}.png`,
        updated_at: createdAtUtc
      };

      user =
        (await User.query().where('connection_id', '=', connectionId)[0]) ||
        (await User.query().insert(user));

      ctx.log('user added', user);
      users.push(user);
    }
    ctx.body = users;
  }

  async function initCallbacks(ctx, next) {
    await knex.schema.dropTableIfExists('callbacks');

    await knex.schema.createTable('callbacks', (t) => {
      t.increments('id').unsigned().unique().primary();
      t.string('tenant_id');
      t.string('correlation');
      t.string('type');
      t.json('data_object');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
    // await knex.table('callbacks').index('correlation')
    // await knex.table('callbacks').index('type')

    ctx.log('recreated callbacks table');
    ctx.body = 'OK';
  }

  logRoutes(router);

  return router;
};
