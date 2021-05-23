const router = require('koa-router')();

const { User, Meeting, Event } = require('../models');
const { logRoutes, rbac } = require('../src/util');

module.exports = ({ psql }) => {
  User.knex(psql);
  Meeting.knex(psql);

  router.get('/zoom/users', listUsers);
  router.get('/zoom/users/:userId/meetings', listMeetings);
  router.post('/zoom/users/:userId/meetings', createMeeting);
  router.get('/zoom/meetings/:id', getMeetingDetails);
  router.get('/zoom/meetings/:id/invitation', getMeetingInvitation);

  async function listUsers(ctx, next) {
    const { data } = await ctx.$zoom.get('/users');
    ctx.body = data;
  }
  async function listMeetings(ctx, next) {
    const { userId } = ctx.params;
    const { data } = await ctx.$zoom.get(`/users/${userId}/meetings`);
    ctx.body = data;
  }

  async function createMeeting(ctx, next) {
    const { userId } = ctx.params;
    const { topic, type, duration, start_time, timezone } = ctx.request.body;
    const { data: details } = await ctx.$zoom.post(`/users/${userId}/meetings`, {
      topic: topic || 'Private Exam',
      type: type || 2,
      duration: duration || 60,
      // timezone: timezone || 'America/Los_Angeles',
      start_time: start_time || Date.now()
    });
    const { id } = ctx.session.user;
    const meeting = await Meeting.query().insert({ details });
    const user = await User.query().where({ id }).first();
    await meeting.$relatedQuery('users').relate(user);

    ctx.$metrics.log('appointment scheduled', {
      fileName: __file,
      lineNumber: __line,
      user
    });

    ctx.body = meeting;
  }

  async function getMeetingDetails(ctx, next) {
    const { data } = await ctx.$zoom.get(`/meetings/${ctx.params.id}`);
    ctx.body = data;
  }

  async function getMeetingInvitation(ctx, next) {
    const { data } = await ctx.$zoom.get(`/meetings/${ctx.params.id}/invitation`);
    ctx.body = data;
  }

  logRoutes(router);

  return router;
};
