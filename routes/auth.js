const router = require('koa-router')();
const bcrypt = require('bcrypt');
const PhoneNumber = require('awesome-phonenumber');
const { atob, btoa, webSafe64, normal64 } = require('../util');
const { Organization, User, Role, Wallet, Verification } = require('../models');
const { logRoutes } = require('../util');
const { TWO_FACTOR_CODE_TTL } = require('../config');

module.exports = ({ psql }) => {
  const { getUserWithDetails, ensureConnected, ensureFriends } = require('../services/identity')(psql);

  Organization.knex(psql);
  User.knex(psql);
  Role.knex(psql);
  Wallet.knex(psql);
  Verification.knex(psql);

  router.post('/login', login);
  router.post('/register', register);
  router.post('/logout', logout);
  router.post('/requestResetPassword', requestResetPassword);
  router.post('/changePassword', changePassword);
  router.post('/2fa', twoFactor);

  // LOGOUT
  async function logout(ctx) {
    ctx.session = null;
    // ctx.cookies.set('koa.sid')
    // ctx.cookies.set('koa.sid.sig')
    ctx.status = 200;
  }

  // REGISTER
  async function register(ctx) {
    let { email, phone, password, name, inviteCode, role } = ctx.request.body;

    if (!email || !password || !name || !phone) {
      ctx.throw(400, 'email, password, name, phone all required');
    }

    const phoneNumber = new PhoneNumber(phone);
    if (!phoneNumber.isValid()) {
      ctx.throw(400, 'phone should be a phone number');
    }
    phone = phoneNumber.getNumber();

    password = bcrypt.hashSync(password, 10);

    // check if user exists
    email = email.trim().toLowerCase();
    const existingUser = await User.query().where({ email }).first();
    if (existingUser) {
      ctx.throw(409, `The email ${email} is already taken.`);
    }

    let user;
    let org = null;
    let friend = null;

    if (inviteCode && inviteCode !== 'undefined') {
      const [hostOrgId, roles, invitedPhone, invitedEmail, inviterId] = await ctx.redis.hmget(
        `INVITE:${inviteCode}`,
        'hostOrgId',
        'roles',
        'phone',
        'email',
        'inviterId'
      );

      if (!invitedPhone && !invitedEmail) {
        ctx.throw(403, 'Your invitation has expired.');
      }

      if (invitedPhone && invitedPhone !== phone) {
        ctx.throw(411, 'You must register using the phone number you were invited with.');
      }

      if (invitedEmail && invitedEmail.toLowerCase() !== email.toLowerCase()) {
        ctx.throw(412, 'You must register using the email you were invited with.');
      }

      try {
        if (hostOrgId) {
          user = await User.query().insertGraphAndFetch({
            name,
            email,
            phone,
            password
          });

          org = await Organization.query().where({ id: hostOrgId }).first();

          await user.$relatedQuery('organizations').relate(org);
          await user
            .$relatedQuery('organizations')
            .patch({ userRoles: { roles } })
            .where({ 'organizations.id': hostOrgId });
        }

        if (inviterId) {
          friend = await User.query().findOne({
            id: inviterId
          });
        }

        await ctx.redis.expire(`INVITE:${inviteCode}`, 1);
      } catch (e) {
        ctx.error('Error saving new user.', e);
        ctx.throw(409);
      }
    }

    try {
      if (!user) {
        user = await User.query().insertGraphAndFetch({
          name,
          email,
          phone,
          password
        });
      }

      // relationships & default role.
      const [mcn, roleRelation] = await Promise.all([
        Organization.query().where({ name: 'MedCreds Network' }).first(),
        Role.query().where({ name: 'patient' }).first()
      ]);

      await Promise.all([
        org?.id != mcn.id ? user.$relatedQuery('organizations').relate(mcn) : Promise.resolve(),
        user.$relatedQuery('roles').relate(roleRelation),
        friend ? ensureFriends(user, friend) : Promise.resolve()
      ]);

      // setup a new wallet
      const { data } = await ctx.streetcred.withRootOrg(({ custodian }) =>
        custodian.post('/api/wallets', { ownerName: name })
      );

      const walletId = data?.walletId;
      if (walletId) {
        const wallet = await Wallet.query().insert({ walletId });
        await user.$relatedQuery('wallets').relate(wallet);

        await Promise.all([
          ensureConnected(user.id, walletId, mcn.id, ctx),
          org && org.id != mcn.id ? ensureConnected(user.id, walletId, org.id, ctx) : Promise.resolve()
        ]);
      }

      const result = await getUserWithDetails(user.id);

      ctx.body = result;
      ctx.session.user = {
        id: user.id,
        roles: result.roles,
        orgRoles: result.orgRoles
      };

      await ctx.$metrics.log('user registered', {
        fileName: __file,
        lineNumber: __line,
        user,
        org,
        payload: { roleName: role }
      });
    } catch (e) {
      ctx.throw(400, 'error registering', e);
    }
  }

  async function twoFactor(ctx) {
    const { code, nonse } = ctx.request.body;

    if (!code || !nonse) {
      ctx.throw(400, 'invalid request');
    }

    const key = `2fa:${code}`;
    const data = await ctx.redis.get(key);

    if (!data) {
      ctx.throw(401, 'invalid/unknown 2fa code');
    }

    const [id, check] = data.split(':');
    if (check !== nonse) {
      ctx.throw(401, 'invalid nonse provided');
    }

    await ctx.redis.expire(key, 1);

    const user = await getUserWithDetails(id);
    if (!user) {
      ctx.throw(401, 'user not found');
    }

    ctx.session.user = {
      id: id,
      roles: user.roles,
      orgRoles: user.orgRoles
    };

    ctx.body = user;
  }

  // LOGIN
  async function login(ctx) {
    const { email, password } = ctx.request.body;
    if (!email || !password) {
      ctx.throw(401, 'email and password required');
    }

    const ttl = TWO_FACTOR_CODE_TTL;
    let user;
    let twoFactorCode;

    try {
      user = await User.query().findOne({ email });
    } catch (e) {
      ctx.error('Failed to fetch user by email.', email);
    }

    if (!user || !bcrypt.compareSync(password, user.password)) {
      ctx.throw(401, 'invalid user or password');
    }
    console.log('user.phone', user.phone);
    if (user.phone) {
      // If the user has a phone, send them a 2fa code
      try {
        twoFactorCode = ctx.generate_2fa_token(email, 6, ctx.traceId);
        const key = `2fa:${twoFactorCode.token}`;
        await ctx.redis.set(key, `${user.id}:${twoFactorCode.nonse}`, 'EX', ttl);
      } catch (e) {
        ctx.body = `Error generating 2FA token for your account. Please contact support.`;
        ctx.error('Error creating 2FA token', e);

        return (ctx.status = 201);
      }

      if (!twoFactorCode.isFake) {
        try {
          await ctx.sender.send2FactorCode({
            to: user.phone,
            code: twoFactorCode.token
          });
        } catch (e) {
          ctx.body = `2FA not setup for your account. Please contact support.`;
          ctx.error(`User ${user.id} tried logging in without a phone number set for 2FA.`);
          return (ctx.status = 200);
        }
      }
      ctx.body = {
        success: true, // This is deprecated but will keep the Mobile app running
        requires2fa: true,
        ttl: ttl,
        nonse: twoFactorCode.nonse
      };
    } else {
      // If the user doesn't have a phone, they will be logged-in without a need for 2fa
      const fullUser = await getUserWithDetails(user.id);
      
      ctx.session.user = {
        id: fullUser.id,
        roles: fullUser.roles,
        orgRoles: fullUser.orgRoles
      };
  
      ctx.body = user;

      ctx.body = {
        success: false, // This is deprecated but will keep the Mobile app running
        requires2fa: false,
        user: fullUser
      };
    }

    ctx.status = 200;
  }

  async function requestResetPassword(ctx) {
    let resetCode = ctx.randtoken.generate(7);
    const key = `RESET:${resetCode}`;

    const { email } = ctx.request.body;
    if (!email) {
      ctx.throw(400, 'missing email');
    }

    const existingUser = await User.query().findOne({ email });
    if (existingUser) {
      await ctx.redis.set(key, existingUser.id);
      await ctx.redis.expire(key, 60 * 15);

      resetCode = webSafe64(btoa(`${resetCode}:${email}`));
      await ctx.sender.sendPasswordReset({ to: email, userName: existingUser.name, resetCode });
    }
    ctx.status = 204;
  }

  async function changePassword(ctx) {
    let { userId, oldPassword, resetCode, password, confirmPassword } = ctx.request.body;

    if (!password || password !== confirmPassword) {
      ctx.throw(400, 'missing password or passwords do not match');
    }

    if (resetCode) {
      let [key] = atob(normal64(resetCode)).split(':');
      key = `RESET:${key}`;
      userId = await ctx.redis.get(key);

      if (!userId) {
        ctx.throw(403, 'expired reset code');
      }
    } else if (oldPassword && userId) {
      const { password } = await User.query().select('password').findById(userId);

      if (!password || !bcrypt.compareSync(oldPassword, password)) {
        ctx.throw(400, 'invalid password or user');
      }
    } else {
      ctx.throw(400, 'missing reset code or old password');
    }

    password = bcrypt.hashSync(password, 10);
    await User.query().patchAndFetchById(userId, { password });
    ctx.status = 204;
  }

  logRoutes(router);

  return router;
};
