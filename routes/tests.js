const router = require('koa-router')();
const moment = require('moment');
const { mapTestDto } = require('../services/mappers.js');

const { Test, Organization, TestState, User } = require('../models');

const { logRoutes } = require('../util');

module.exports = ({ psql }) => {
  Test.knex(psql);
  TestState.knex(psql);
  Organization.knex(psql);
  User.knex(psql);

  const { ensureConnected } = require('../services/identity')(psql);

  router.post('/tests', newTest);

  async function newTest(ctx, next) {
    const { hostOrgId, email } = ctx.request.body;

    if (!hostOrgId || !email) {
      ctx.throw(400, 'must pass hostOrgId and email');
    }

    let isDoctor = ctx.isAuthorized(ctx.session.user, 'doctor', hostOrgId);

    if (!isDoctor) {
      ctx.throw(403, 'must be doctor');
    }

    const user = await User.query()
      .where({ email: email.trim().toLowerCase() })
      .withGraphJoined('wallets')
      .first();
    if (!user) {
      ctx.throw(400, 'invalid user');
    }

    try {
      const [org, testState] = await Promise.all([
        Organization.query().findOne({ id: hostOrgId }),
        await TestState.query().findOne({ state: 'new' })
      ]);

      const walletId = user.wallets && user.wallets.length && user.wallets[user.wallets.length - 1].walletId;
      if (!walletId) {
        ctx.throw(500);
      }

      const { orgConnectionId } = await ensureConnected(user.id, walletId, org.id, ctx);

      const test = await Test.transaction(async () => {
        const t = await Test.query().insert({
          credential: {},
          patient_id: user.id,
          test_ref: `${orgConnectionId}.${moment.utc().toISOString()}`,
          test_state_id: testState.id
        });

        await org.$relatedQuery('tests').relate(t);

        return await Test.query().findOne({ 'tests.id': t.id }).withGraphJoined('[state, patient]');
      });

      ctx.body = mapTestDto(test);
    } catch (e) {
      ctx.error('Failed to create new test.', e);
      ctx.throw(500, 'failed to create new test');
    }
  }

  logRoutes(router);

  return router;
};
