const router = require('koa-router')();
const { logRoutes, toInt } = require('../util');
const { Verification, Organization, User, WalletCredential, Callback } = require('../models');
const withers = require('../services/withers');
const { mapVerificationDto, mapUserDto, mapOrganizationDto } = require('../services/mappers.js');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const PhoneNumber = require('awesome-phonenumber');

module.exports = ({ psql, redis }) => {
  Verification.knex(psql);
  Organization.knex(psql);
  User.knex(psql);
  WalletCredential.knex(psql);
  Callback.knex(psql);

  const { ensureConnected, ensureFriends } = require('../services/identity')(psql);

  const basePath = '/verify';
  // router.post(basePath, rbac('verifier', 'patient', 'doctor'), startVerification)
  router.post(basePath, startVerification);
  router.get(`${basePath}/consent/:id`, getHolderVerificationRequest);
  router.get(`${basePath}/:id`, getVerifierVerificationStatus);
  router.post(`${basePath}/:id/send`, sendVerification);
  router.post(`${basePath}/:id/approve`, approveHolderVerification);
  router.get(`${basePath}/proof/:walletId/:verificationId`, getProof);

  async function getLatestCredentialId(userId, policyName) {
    let shortPolicyName = policyName && policyName.replace('Proof of', '').trim().replace('erature', '');
    let credentials = await WalletCredential.query().where({ userId }).orderBy('createdAt', 'desc');
    credentials = credentials.filter((cred) => cred.schemaName.includes(shortPolicyName));

    if (credentials?.length > 0) {
      return credentials[0].credentialId;
    } else {
      return null;
    }
  }

  async function findMatchingVerificationId(ctx, policyName, walletId, userConnectionId, createdAtUtc) {
    const requests = await Callback.query()
      .select('correlation')
      .where({ type: 'verification_request' })
      .where('createdAt', '>=', moment.utc(createdAtUtc).toISOString())
      .whereRaw(`data_object->'data'->>'ConnectionId' = '${userConnectionId}'`)
      .orderBy('createdAt');

    for (let i = 0; i < requests.length; i++) {
      const { correlation: verificationId } = requests[i];
      const { data: verification } = await ctx.streetcred.withRootOrg(({ custodian }) =>
        custodian.get(`/api/${walletId}/verifications/${verificationId}`)
      );

      if (
        verification.state === 'Requested' &&
        verification.policy?.name === policyName &&
        moment.utc(verification.createdAtUtc) >= moment.utc(createdAtUtc)
      ) {
        return verificationId;
      }
    }

    return null;
  }

  async function getProof(ctx, next) {
    ctx.throw(500, 'DEPRECATED. REMOVE METHOD IF NOBODY COMPLAINS');

    const { verificationId } = ctx.params;

    if (!verificationId) {
      ctx.throw(400);
    }

    try {
      ctx.body = await ctx.streetcred.withRootOrg(({ agency }) => agency.getVerification(verificationId));
    } catch (e) {
      ctx.error('Failed to get the proof.', e);
    }
  }

  async function startVerification(ctx, next) {
    const { policyId, policyName } = ctx.request.body;
    let { hostOrgId: orgId } = ctx.request.query;

    if (orgId) {
      let isVerifier = ctx.isAuthorized(ctx.session.user, 'verifier', orgId);
      let isRoot = ctx.session.user.roles.includes('root');

      if (!isVerifier && !isRoot) {
        ctx.throw(403);
      }
    }

    try {
      await withers.withRootOrg((rootOrg) => {
        // allow passing in orgId, but default to rootOrgId
        orgId = orgId || rootOrg.id;
        orgId = parseInt(orgId);
      });
    } catch (err) {
      ctx.throw(400);
    }

    if (!policyId || !orgId) {
      ctx.throw(400);
    }

    try {
      const verifierId = ctx.session.user.id;
      const verification = await Verification.query().insert({
        verifierId,
        orgId,
        data: {
          policyId,
          policyName,
          state: 'Created'
        }
      });

      ctx.body = mapVerificationDto(verification);
      ctx.status = 200;

      await ctx.$metrics.log('verification requested', {
        fileName: __file,
        lineNumber: __line,
        user: { id: verifierId },
        org: { id: orgId },
        payload: {
          verificationId: verification.id
        }
      });
    } catch (err) {
      ctx.error('Error starting verification request.', err);
      ctx.throw(500, err);
    }
  }

  async function sendVerification(ctx, next) {
    let { id } = ctx.params;
    id = toInt(ctx, id, 400);

    let { to, channel } = ctx.request.body;

    channel = channel ? channel.toLowerCase() : 'sms';
    if (!to) {
      ctx.throw(400);
    }

    // normalize the number if asked
    if (channel === 'sms') {
      const phoneNumber = new PhoneNumber(to);
      if (!phoneNumber.isValid()) {
        ctx.throw(400, 'invalid phone number');
      }

      to = phoneNumber.getNumber();
    }

    const verifier = await User.query().where({ id: ctx.session.user.id }).first();
    if (!verifier) {
      ctx.throw(401);
    }

    let verification = await Verification.query().findById(id).first();
    if (!verification) {
      ctx.throw(400, 'invalid verification');
    }

    try {
      let { data } = verification;
      data = {
        ...data,
        to,
        channel,
        state: 'Sent'
      };

      await Verification.query().patch({ data }).where({ id });
      await ctx.sender.sendProofRequest({
        channel,
        to,
        verifyId: id,
        verifier,
        policyName: data.policyName
      });

      ctx.body = mapVerificationDto({
        ...verification,
        data
      });

      ctx.status = 200;
    } catch (err) {
      ctx.error('Error sending verification request.', err);
      ctx.throw(500, err);
    }
  }

  async function getVerifierVerificationStatus(ctx, next) {
    let { id } = ctx.params;

    if (!id) {
      ctx.throw(400);
    }

    let { orgId, verifierId, data } = await Verification.query().findById(id);
    if (!orgId || !data) {
      ctx.throw(400);
    }

    const [verifier, org] = await Promise.all([
      User.query().findOne({ id: verifierId }),
      Organization.query().findOne({ id: orgId })
    ]);

    if (!org || !verifier || verifierId !== parseInt(ctx.session.user.id)) {
      ctx.throw(403, 'User not allowed to see this verification.');
    }

    let { orgVerificationId: verificationId, policyId } = data;
    let state = 'Requested';
    let proof = {};

    if (verificationId) {
      proof = await ctx.streetcred.withOrg(orgId, ({ agency }) => agency.getVerification(verificationId));
      state = proof.state;
    } else {
      const policy = await ctx.streetcred.getVerificationPolicy(orgId, policyId);
      proof = policy || proof;
    }

    try {
      ctx.body = {
        organization: mapOrganizationDto(org),
        verifier: mapUserDto(org),
        verificationId,
        state,
        proof
      };

      ctx.status = 200;
    } catch (err) {
      ctx.error('Error getting proof request.', err);
      ctx.throw(500, err);
    }
  }

  async function getHolderVerificationRequest(ctx, next) {
    const { id } = ctx.params;

    if (!id) {
      ctx.throw(400);
    }

    let [holder, v] = await Promise.all([
      User.query().findOne({ id: ctx.session.user.id }).withGraphFetched('[wallets]'),
      Verification.query().findById(id).first()
    ]);

    if (!v) {
      ctx.throw(410);
    }

    let { orgId, verifierId, data } = v;
    if (!orgId || !data) {
      ctx.throw(500);
    }

    const [verifier, org] = await Promise.all([
      User.query().findOne({ id: verifierId }),
      Organization.query().findOne({ id: orgId })
    ]);

    if (!org || !verifier) {
      ctx.throw(500);
    }

    const walletId = holder && holder.wallets && holder.wallets.length && holder.wallets[0].walletId;

    let { policyId, policyName, userWalletId, grabToken } = data;
    if ((v.holderId && v.holderId !== holder.id) || (userWalletId && userWalletId !== walletId)) {
      ctx.throw(403, 'Verification already claimed by another user.');
    }

    if (!userWalletId) {
      if (grabToken) {
        ctx.throw(409, 'Verification already being grabbed in another request.');
      }

      grabToken = uuidv4();
      v = await Verification.query().patchAndFetchById(id, {
        data: {
          ...data,
          grabToken
        }
      });

      if (v.data.grabToken !== grabToken) {
        ctx.throw(409, 'Verification already being grabbed in another request.');
      }

      const { connectionId, orgConnectionId } = await ensureConnected(holder.id, walletId, orgId, ctx);

      try {
        var { data: verification } = await ctx.$streetcred.withOrg(orgId, async ({ client }) =>
          client.put(`/verifications/policy/${policyId}/connections/${orgConnectionId}`)
        );
      } catch (e) {
        ctx.error(
          `Failed to create verification for policy ${policyId} with connection ${orgConnectionId}`,
          e
        );
        ctx.throw(500);
      }

      delete data.grabToken;
      v = await Verification.query().patchAndFetchById(id, {
        data: {
          ...data,
          orgVerificationId: verification.verificationId,
          proposedAtUtc: verification.createdAtUtc,
          policyName: verification.policy.name,
          policyVersion: verification.policy.version,
          userConnectionId: connectionId,
          userWalletId: walletId,
          state: 'Requested'
        }
      });
    }

    const credentialId = await getLatestCredentialId(ctx.session.user.id, policyName);
    let credential;

    if (credentialId) {
      try {
        const { data } = await ctx.streetcred.withRootOrg(({ custodian }) =>
          custodian.get(`/api/${walletId}/credentials/${credentialId}`)
        );

        credential = data;
      } catch (e) {
        ctx.error('Error fetching credential.', e);
      }
    }

    ctx.body = {
      state: v.data.state,
      finalized: !!v.holderId,
      organization: mapOrganizationDto(org),
      verifier: mapUserDto(verifier),
      policyName,
      policyId,
      credential
    };

    ctx.status = 200;
  }

  async function approveHolderVerification(ctx, next) {
    const { id } = ctx.params;
    const { body: requestBody } = ctx.request;
    const { walletId } = requestBody;

    if (!walletId || !id) {
      ctx.throw(400);
    }

    let verification = await Verification.query()
      .findById(id)
      .withGraphJoined('[organization, verifier]')
      .first();

    if (!verification) {
      ctx.throw(400, 'Invalid verification ID.');
    }

    const userWalletId = verification.data?.userWalletId;
    if (verification.holderId || userWalletId !== walletId) {
      ctx.throw(409, 'Verification request has been fulfilled already.');
    }

    const { verifier } = verification;
    const holder = await User.query()
      .findOne({
        id: ctx.session.user.id
      })
      .withGraphFetched('[organizations]');

    const { userConnectionId, proposedAtUtc } = verification.data;
    let { policyName } = verification.data;
    const userVerificationId = await findMatchingVerificationId(
      ctx,
      policyName,
      userWalletId,
      userConnectionId,
      proposedAtUtc
    );

    if (!userVerificationId) {
      ctx.throw(410, "Verification cannot be found in user's wallet.");
    }

    try {
      const existingOrg = holder.organizations.find((org) => org.id === verification.organization.id);
      if (!existingOrg) {
        await verification.organization.$relatedQuery('users').relate(holder);
        verification = await Verification.query()
          .findById(id)
          .withGraphJoined('[organization, verifier]')
          .first();
      }

      const credentialId = await getLatestCredentialId(holder.id, policyName);

      if (policyName === 'Proof of Self Check') policyName = 'DailySelfCheck';
      if (policyName === 'Proof of Test Result') policyName = 'TestDetails';
      if (policyName === 'Proof of Temperature') policyName = 'DailyTempCheck';

      await ctx.streetcred.withRootOrg(({ custodian }) =>
        custodian.put(`/api/${walletId}/verifications/${userVerificationId}`, [
          {
            credentialId,
            policyName: `${policyName}`,
            hidden: false
          }
        ])
      );

      const data = {
        ...verification.data,
        userVerificationId,
        credentialId,
        state: 'Accepted'
      };

      await verification.$relatedQuery('holder').relate(holder);
      await ensureFriends(verifier, holder);

      await Verification.query()
        .patch({
          data,
          updated_at: psql.raw('CURRENT_TIMESTAMP')
        })
        .where({ id });
      await ctx.sender.sendVerificationConfirmation({ verifier, holder });

      ctx.body = mapVerificationDto({
        ...verification,
        data,
        holder
      });

      await ctx.$metrics.log('verification approved', {
        fileName: __file,
        lineNumber: __line,
        user: { id: holder.id },
        payload: {
          verificationId: verification.id,
          walletId
        }
      });
    } catch (err) {
      ctx.error('Error approving proof request.', err);
      ctx.throw(500, err);
    }
  }

  logRoutes(router);

  return router;
};
