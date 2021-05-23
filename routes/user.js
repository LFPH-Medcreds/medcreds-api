const router = require('koa-router')();
const moment = require('moment');
const PhoneNumber = require('awesome-phonenumber');
const {
  mapVerificationDto,
  mapCredentialDto,
  mapConnectionDto,
  mapTestDto,
  mapOrganizationDto
} = require('../services/mappers.js');

const {
  User,
  Organization,
  Callback,
  Event,
  Test,
  Role,
  TestState,
  Verification,
  WalletConnection,
  WalletCredential
} = require('../models');
const { logRoutes } = require('../src/util');

module.exports = ({ psql, knex }) => {
  User.knex(psql);
  Organization.knex(psql);
  Callback.knex(psql);
  Event.knex(psql);
  Test.knex(psql);
  Role.knex(psql);
  TestState.knex(psql);
  Verification.knex(psql);
  WalletConnection.knex(psql);
  WalletCredential.knex(psql);

  const { getUserWithDetails, ensureFriends } = require('../services/identity')(psql);

  router.get('/users', getUsers);
  router.get('/users/me', getMe);
  router.get('/users/wallet', getWallet);
  router.get('/users/tests', getTests);
  router.head('/users/check', checkUser);
  router.get('/users/:id', getUser);
  // router.post('/users', create) // this happens with a login or other credential granting
  router.put('/users', update);
  router.delete('/users/:id', deleteUser);

  router.post('/users/invite', inviteUser);
  router.post('/users/invite/:type', inviteUser);
  router.post('/users/mass/:type', massNotify);
  router.post('/users/open/:type', openInvite);

  async function getMe(ctx, next) {
    const { id } = ctx.session.user;
    if (!id) {
      ctx.session = null;
      ctx.throw(401);
    }

    try {
      const user = await getUserWithDetails(id);

      if (!user) {
        ctx.throw(407);
      }

      ctx.body = user;
    } catch (e) {
      ctx.error(e);
      ctx.session = null;
      ctx.throw(400, 'error getting user');
    }
  }

  async function getWallet(ctx, next) {
    const { id } = ctx.session.user;
    if (!id) {
      ctx.throw(401);
    }

    const user = await User.query().where({ id }).withGraphFetched('[wallets]').first();
    if (!user) {
      ctx.throw(400);
    }

    const walletId = user.wallets && user.wallets.length && user.wallets[user.wallets.length - 1].walletId;
    if (!walletId) {
      ctx.throw(500);
    }

    try {
      let [connections, credentials, verificationRequests, verificationConsents] = await Promise.all([
        WalletConnection.query()
          .where({ user_id: id })
          .withGraphJoined('[organization, holder]')
          .orderBy('createdAt', 'desc'),
        WalletCredential.query()
          .where({ user_id: id })
          .withGraphJoined('[organization, holder]')
          .orderBy('createdAt', 'desc'),
        Verification.query()
          .where({ verifier_id: id })
          .withGraphJoined('[organization, verifier, holder]')
          .orderBy('createdAt', 'desc'),
        Verification.query()
          .where({ holder_id: id })
          .withGraphJoined('[organization, verifier, holder]')
          .orderBy('createdAt', 'desc')
      ]);

      const wallet = {
        walletId,
        connections: connections.map(mapConnectionDto),
        credentials: credentials.map(mapCredentialDto),
        verificationRequests: verificationRequests
          .map(mapVerificationDto)
          .filter((v) => v.recipient || v.holder), // filter out verification requests that haven't been sent or accepted by anyone

        verificationConsents: verificationConsents.map(mapVerificationDto)
      };

      ctx.body = wallet;
    } catch (e) {
      ctx.error('Unable to fetch wallet details.', e);
    }
  }

  async function getTests(ctx, next) {
    const { hostOrgId } = ctx.request.query;

    if (!hostOrgId) {
      ctx.throw(400);
    }

    let isDoctor = ctx.isAuthorized(ctx.session.user, 'doctor', hostOrgId);
    let isAdmin = ctx.isAuthorized(ctx.session.user, 'admin', hostOrgId);
    let isRoot = ctx.session.user.roles.includes('root');

    if (!isDoctor && !isAdmin && !isRoot) {
      ctx.throw(403);
    }

    const org = await Organization.query()
      .alias('o')
      .findOne({ 'o.id': hostOrgId })
      .withGraphFetched('[tests]')
      .withGraphJoined('tests.[state, patient]')
      .first();

    if (!org) {
      ctx.throw(404);
    }

    ctx.body = {
      organization: mapOrganizationDto(org),
      tests: org.tests.map(mapTestDto),
      testNames: [...new Set(org.tests.map((t) => t.credential?.testName).filter((n) => n))],
      testMfgs: [...new Set(org.tests.map((t) => t.credential?.testManufacturerName).filter((n) => n))]
    };
  }

  async function massNotify(ctx, next) {
    const { type } = ctx.params;
    let { users, message, subject, hostOrgId } = ctx.request.body;

    if (!users || !message || !subject) {
      ctx.throw(400, 'must provide users, message, subject');
    }

    let isDoctor = ctx.isAuthorized(ctx.session.user, 'doctor', hostOrgId);
    let isVerifier = ctx.isAuthorized(ctx.session.user, 'verifier', hostOrgId);
    let isAdmin = ctx.isAuthorized(ctx.session.user, 'admin', hostOrgId);
    let isRoot = ctx.session.user.roles.includes('root');

    if (!isDoctor && !isVerifier && !isAdmin && !isRoot) {
      ctx.throw(403);
    }

    const org = hostOrgId ? await ctx.$withers.withOrg(hostOrgId) : { name: 'MedCreds Network' };
    let tokenLink = `${process.env.PORTAL_ORIGIN}/login`;

    const emails = [];

    switch (type) {
      case 'email':
        try {
          for await (const user of users) {
            const email = {
              subject,
              from: 'MedCreds Network <notification@get.medcreds.com>',
              to: user.email,
              'v:name': user.name,
              'v:message': message,
              'v:orgName': org.name,
              'v:tokenLink': tokenLink,
              template: 'notify'
            };
            const mail = await ctx.sender.mailgun.messages().send(email);
            if (mail) {
              emails.push(mail);
            }
          }

          ctx.body = emails;
        } catch (e) {
          ctx.error(e);
          ctx.status = 500;
        }
        break;
      case 'text':
        try {
          const { body, to } = ctx.request.body;
          ctx.body = ctx.sender.sendInvitationSms({
            to,
            body
          });
        } catch (e) {
          ctx.error(e);
          ctx.throw(500);
        }
        break;
    }

    return next();
  }

  async function openInvite(ctx, next) {
    const { type } = ctx.params;

    let { to } = ctx.request.body;

    if (!to) {
      ctx.throw(400, 'must provide to');
    }

    const me = await User.query().findOne({ id: ctx.session.user.id });
    if (!me) {
      ctx.throw(401);
    }

    // We should let the doctor set the FROM number
    switch (type) {
      case 'email':
        try {
          const { to, body: text } = ctx.request.body;
          const email = ctx.sender.sendInvitationEmail({
            to,
            text,
            me
          });
          ctx.body = email;
        } catch (e) {
          ctx.error(e);
          ctx.status = 500;
        }
        break;
      case 'text':
        try {
          const { body, to } = ctx.request.body;
          ctx.body = ctx.sender.sendInvitationSms({
            to,
            body,
            me
          });
        } catch (e) {
          ctx.error(e);
          ctx.throw(500);
        }
        break;
    }

    return next();
  }

  async function inviteUser(ctx, next) {
    let { type } = ctx.params;
    let { phone, email, hostOrgId, roles } = ctx.request.body;

    if (!phone?.length && !email?.length) {
      ctx.throw(400, 'must specify either an email or phone');
    }

    if (!type) {
      if (email?.length) {
        type = 'email';
      } else if (phone?.length) {
        type = 'text';
      }
    }

    if (!type) {
      ctx.throw(400, 'invitation type cannot be detected.');
    }

    // normalize the number if asked
    if (phone) {
      const phoneNumber = new PhoneNumber(phone);
      if (!phoneNumber.isValid()) {
        ctx.throw(400, 'invalid phone number');
      }

      phone = phoneNumber.getNumber();
    }

    const me = await User.query().findOne({ id: ctx.session.user.id });
    if (!me) {
      ctx.throw(401);
    }

    let hostOrg;
    if (hostOrgId) {
      let isAdmin = ctx.isAuthorized(ctx.session.user, 'admin', hostOrgId);
      let isRoot = ctx.session.user.roles.includes('root');
      if (!isAdmin && !isRoot) {
        ctx.throw(403, 'insufficient privileges');
      }

      hostOrg = await Organization.query().findById(hostOrgId);
    } else {
      hostOrg = await Organization.query().findOne({
        name: 'MedCreds Network'
      });
    }

    if (!hostOrg) {
      ctx.throw(400, 'invalid org');
    }

    let existingUser =
      (type === 'email' && (await User.query().findOne({ email }))) ||
      (type === 'text' && (await User.query().findOne({ phone })));

    if (existingUser) {
      await ensureFriends(me, existingUser);

      if (hostOrg) {
        const existingOrgRelation = await existingUser
          .$relatedQuery('organizations')
          .where('organization_id', hostOrg.id)
          .first();

        if (existingOrgRelation) {
          return (ctx.status = 209);
        }

        await existingUser.$relatedQuery('organizations').relate({
          id: hostOrg.id,
          userRoles: { roles }
        });
      }

      try {
        await ctx.sender.sendOrgAdditionNotification({
          toMobile: type === 'text' && phone,
          toEmail: type === 'email' && email,
          inviterName: me.name,
          orgName: hostOrg.name,
          inviteeName: existingUser.name
        });
      } catch (e) {
        ctx.error('Failed to send notification.', e);
      }

      return (ctx.status = 204);
    } else {
      const inviteCode = ctx.randtoken.generate(7);
      const key = `INVITE:${inviteCode}`;

      await ctx.redis.hmset(key, {
        hostOrgId,
        roles,
        phone,
        email,
        inviterId: me.id
      });

      await ctx.redis.expire(key, 60 * 60 * 72);

      ctx.body = {
        inviteCode
      };

      // We should let the doctor set the FROM number
      switch (type) {
        case 'email':
          try {
            const { body: text } = ctx.request.body;
            ctx.body.message = ctx.sender.sendInvitationEmail({
              to: email,
              me,
              inviteCode,
              text,
              roles,
              hostOrgId
            });
          } catch (e) {
            ctx.error(e);
            ctx.status = 500;
          }
          break;
        case 'text':
          try {
            const { body } = ctx.request.body;
            ctx.body.message = ctx.sender.sendInvitationSms({
              to: phone,
              me,
              body,
              roles,
              hostOrgId,
              inviteCode
            });
          } catch (e) {
            ctx.error(e);
            ctx.throw(500);
          }
          break;
      }

      ctx.$metrics.log('user invited', {
        fileName: __file,
        lineNumber: __line,
        org: hostOrg,
        payload: {
          type
        }
      });
    }

    return next();
  }

  async function getUsers(ctx, next) {
    ctx.throw(500, 'DEPRECATED. REMOVE METHOD IF NOBODY COMPLAINS');

    const { id: myId, roles: myRoles } = ctx.session.user;
    const { orgId } = ctx.query;

    if (!orgId) {
      ctx.throw(400);
    }

    let isDoctor = ctx.isAuthorized(ctx.session.user, 'doctor', orgId);
    let isVerifier = ctx.isAuthorized(ctx.session.user, 'verifier', orgId);
    let isAdmin = ctx.isAuthorized(ctx.session.user, 'admin', orgId);
    let isRoot = ctx.session.user.roles.includes('root');

    if (!isDoctor && !isAdmin && !isVerifier && !isRoot) {
      ctx.throw(403);
    }

    let query = User.query().withGraphJoined('[organizations, roles, tests, meetings, callbacks, wallets]');
    if (orgId) {
      query = query.where('organizations.id', orgId);
    }

    ctx.body = await query;

    for (const item of ctx.body) {
      item.roles = item.roles.map((r) => r.name);
      delete item.organizations;
      delete item.password;
      delete item.createdAt;
      delete item.updatedAt;
    }
  }

  async function getUser(ctx, next) {
    ctx.throw(500, 'DEPRECATED. REMOVE METHOD IF NOBODY COMPLAINS');

    const { id, email } = ctx.params;
    let whereClause;
    if (id) {
      whereClause = {
        id
      };
    } else if (email) {
      whereClause = {
        email
      };
    } else {
      ctx.status = 400;
      return;
    }

    const user = await User.query()
      .where(whereClause)
      .withGraphFetched('[roles, tests, meetings, organizations, callbacks]')
      .first();
    if (user.id === ctx.session.user.id) {
      const { id, name, email, roles } = user;

      ctx.body = {
        id,
        name,
        email,
        roles: roles.map((r) => r.name)
      };
    } else ctx.status = 401;
  }

  async function checkUser(ctx, next) {
    const { email, orgId } = ctx.query;

    if (!email || !orgId) {
      ctx.throw(400);
    }

    let isDoctor = await ctx.isAuthorized(ctx.session.user, 'doctor', orgId);
    let isVerifier = await ctx.isAuthorized(ctx.session.user, 'verifier', orgId);
    let isAdmin = await ctx.isAuthorized(ctx.session.user, 'admin', orgId);
    let isRoot = ctx.session.user.roles.includes('root');

    if (!isDoctor && !isVerifier && !isAdmin && !isRoot) {
      ctx.throw(403);
    }

    let user;
    try {
      user = await User.query().findOne({ email });
      if (!user) {
        ctx.error('user not found by email ', email);
        ctx.throw(404);
      }
    } catch (e) {
      ctx.error('failed to fetch user by email ', email);
      ctx.throw(404);
    }

    let organization_user = await user
      .$relatedQuery('organizations')
      .where({ 'organizations.id': orgId })
      .first();

    ctx.status = organization_user ? 200 : 404;
  }

  async function update(ctx, next) {
    const { test: testPayload } = ctx.request.body;

    if (!testPayload) {
      ctx.throw(400);
    }

    const { patientId, credential } = testPayload;
    if (!patientId) {
      ctx.throw(400);
    }

    const testState = await TestState.query().findOne({
      state: 'awaiting results'
    });

    const test = await Test.query()
      .findOne({
        id: testPayload.id
      })
      .patch({
        credential,
        testStateId: testState.id
      });

    ctx.body = test;
  }

  async function deleteUser(ctx, next) {
    ctx.throw(500, 'DEPRECATED. REMOVE METHOD IF NOBODY COMPLAINS');

    ctx.body = await User.afterDelete().where({
      user_id: ctx.params.id
    });
  }

  logRoutes(router);

  return router;
};
