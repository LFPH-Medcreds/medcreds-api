const router = require('koa-router')();
const { sign } = require('../services/jwt');
const bcrypt = require('bcrypt');
const { Client } = require('pg');
const pgNotify = require('@becual/pg-notify');
const PassThrough = require('stream').PassThrough;

const { DATABASE_URL } = require('../config');

const { User, Role, Event } = require('../models');
const { logRoutes } = require('../src/util');

module.exports = ({ psql }) => {
  User.knex(psql);
  Role.knex(psql);
  Event.knex(psql);

  router.get('/users/stream', /* sse(), */ getSSE);

  async function getSSE(ctx, next) {
    ctx.throw(500, 'DEPRECATED. REMOVE METHOD IF NOBODY COMPLAINS');
    
    ctx.log('in getSSE');
    try {
      ctx.req.setTimeout(2147483647);
      ctx.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      ctx.status = 200;

      const stream = new PassThrough();

      ctx.body = stream;

      ctx.log('user in /users/stream', ctx.session);

      // const { id } = ctx.session.user
      // const { user } = ctx.session
      // const user = await User.query().where({ email }).withGraphFetched('[events]').first()

      // const processEvent = async event => {
      //   let response = ''
      //   const { id } = user
      //   if (!id) return
      //   const { user_id, event_id } = event.data
      //   if (id !== user_id) return
      //   console.log('event.data', event.data)
      //   if (event_id) {
      //     const e = await Event.query().where({ id: event_id }).first()
      //     response = e.type
      //   }
      //   const write = `data: ${response}\nid: ${event.data.id}\n\n`
      //   console.log('write', write)
      //   stream.write(write)
      // }

      // const client = new Client(DATABASE_URL)
      // const tables = ['users_events', 'tests_events']

      // await client.connect()
      // const subscription = await pgNotify(client).subscribe(tables)

      // subscription.on('INSERT', processEvent)
      // subscription.on('UPDATE', processEvent)
      // subscription.on('DELETE', processEvent)

      // const socket = ctx.socket

      // const close = async event => {
      //   await client.end()
      // }

      // socket.on('error', close)
      // socket.on('disconnect', close)
    } catch (e) {
      ctx.error(e);
    }
  }

  logRoutes(router);

  return router;
};
