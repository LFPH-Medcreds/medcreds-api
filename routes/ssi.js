const moment = require('moment');
const router = require('koa-router')();
const { logRoutes } = require('../src/util');

const { Test, User, Organization, TestState, WalletCredential, AgencyCredential } = require('../models');

module.exports = () => {
  router.post('/credentials/temp', issueTemp);
  router.post('/credentials/selfcheck', issueSelfCheck);
  router.post('/credentials', offerCredential);
  router.get('/credentials/definitions/:hostOrgId', listCredentialDefinitions);
  router.get('/verifications/policies', listVerificationPolicies);
  router.get('/verifications/:verificationId', getVerification); // query hostOrgId?
  router.delete('/credentials/:hostOrgId', deleteCredential);

  async function listCredentialDefinitions(ctx, next) {
    const { hostOrgId } = ctx.params;

    if (!hostOrgId) {
      ctx.throw(400);
    }

    return await ctx.streetcred.listCredentialDefinitions(hostOrgId);
  }

  function getFirst(name) {
    return name && name.split(' ')[0];
  }
  function getLast(name) {
    const parts = name.split(' ');
    return parts && parts[parts.length - 1];
  }

  async function issueTemp(ctx, next) {
    const { hostOrgId, patientEmail, temp, tempUnits: isCelsius } = ctx.request.body;

    const { ensureConnected } = require('../services/identity')(ctx.psql);
    WalletCredential.knex(ctx.psql);

    try {
      let organization = await Organization.query().where({ name: 'MedCreds Network' }).first();
      const orgId = patientEmail && hostOrgId ? hostOrgId : organization.id;

      if (organization.id !== orgId) {
        organization = await Organization.query().where({ id: orgId }).first();
      }

      if (!organization) {
        ctx.throw(400);
      }

      const me = await User.query().where({ id: ctx.session.user.id }).withGraphFetched('[wallets]').first();

      if (!me) {
        ctx.throw(500);
      }

      const user = patientEmail
        ? await User.query().where({ email: patientEmail }).withGraphFetched('[wallets]').first()
        : me;

      if (!user) {
        ctx.throw(400);
      }

      const walletId = user.wallets && user.wallets.length && user.wallets[user.wallets.length - 1].walletId;
      if (!walletId) {
        ctx.throw(500);
      }

      const { orgConnectionId } = await ensureConnected(user.id, walletId, organization.id, ctx);
      const definitions = await ctx.streetcred.listCredentialDefinitions(orgId);

      const definition = definitions.find(
        (def) => def.name === 'Certified Temperature' && def.version === '1.0'
      );

      if (!definition) {
        ctx.throw(404, `no Certified Temperature 1.0 credential schema for orgId ${orgId}`);
      }

      const { definitionId } = definition;

      const tempF = isCelsius ? Number((temp * 9) / 5 + 32).toFixed(1) : temp;
      const tempC = isCelsius ? temp : Number(((temp - 32) * 5) / 9).toFixed(1);

      // 0: "issuedDateUtc"
      // 1: "lastName"
      // 2: "firstName"
      // 3: "tempF"
      // 4: "tempC"
      // 5: "issuedByName"
      // 6: "issuedOnBehalfOfName"

      const credential = {
        definitionId,
        automaticIssuance: true,
        connectionId: orgConnectionId,
        credentialValues: {
          firstName: getFirst(user.name),
          lastName: getLast(user.name),
          tempF: `${tempF}`,
          tempC: `${tempC}`,
          issuedByName: organization.name,
          issuedOnBehalfOfName: patientEmail ? me.name : user.name,
          issuedDateUtc: moment.utc().toISOString()
        }
      };

      const walletCredential = await ctx.streetcred.withOrg(orgId, ({ agency }) =>
        agency.createCredential(credential)
      );

      const { state, credentialId, schemaId } = walletCredential;

      // await WalletCredential.query().insert({
      //     credential_id: credentialId,
      //     user_id: user.id,
      //     org_id: orgId,
      //     schemaName: schemaId.split(':')[2],
      //     schemaVersion: schemaId.split(':')[3],
      //     state
      // })

      if (state) {
        await ctx.sender.notifyOfCredential({ user, organization });
        ctx.body = { state, credentialId, schemaId };
      }
    } catch (e) {
      ctx.error('Error issuing temp credential.', e);
      ctx.throw(418, 'something wrong issuing temp cred');
    }
  }

  async function issueSelfCheck(ctx, next) {
    const { hostOrgId, patientEmail, closeProximity, newSymptoms, emergencySymptoms, testAdvised } =
      ctx.request.body;

    const { ensureConnected } = require('../services/identity')(ctx.psql);
    WalletCredential.knex(ctx.psql);

    try {
      let organization = await Organization.query().where({ name: 'MedCreds Network' }).first();
      const orgId = patientEmail && hostOrgId ? hostOrgId : organization.id;

      if (organization.id !== orgId) {
        organization = await Organization.query().where({ id: orgId }).first();
      }

      if (!organization) {
        ctx.throw(400);
      }

      const me = await User.query().where({ id: ctx.session.user.id }).withGraphFetched('[wallets]').first();

      if (!me) {
        ctx.throw(500);
      }

      const user = patientEmail
        ? await User.query().where({ email: patientEmail }).withGraphFetched('[wallets]').first()
        : me;

      if (!user) {
        ctx.throw(400);
      }

      const walletId = user.wallets && user.wallets.length && user.wallets[user.wallets.length - 1].walletId;
      if (!walletId) {
        ctx.throw(500);
      }

      const { orgConnectionId } = await ensureConnected(user.id, walletId, organization.id, ctx);
      const definitions = await ctx.streetcred.listCredentialDefinitions(orgId);

      const definition = definitions.find(
        (def) => def.name === 'Certified Self Check' && def.version === '1.1'
      );

      if (!definition) {
        ctx.throw(404, `no Certified Self Check 1.1 credential schema for orgId ${orgId}`);
      }

      const { definitionId } = definition;

      dt = new Date();

      // 0: "issuedDateUtc"
      // 1: "lastName"
      // 2: "firstName"
      // 3: "tempF"
      // 4: "tempC"
      // 5: "issuedByName"
      // 6: "issuedOnBehalfOfName"
      const credential = {
        definitionId,
        automaticIssuance: true,
        connectionId: orgConnectionId,
        credentialValues: {
          firstName: getFirst(user.name),
          lastName: getLast(user.name),
          closeProximity: `${closeProximity}`,
          newSymptoms: `${newSymptoms}`,
          emergencySymptoms: `${emergencySymptoms}`,
          testAdvised: `${testAdvised}`,
          issuedByName: organization.name,
          issuedOnBehalfOfName: patientEmail ? me.name : user.name,
          issuedDateUtc: dt.toISOString()
        }
      };

      const walletCredential = await ctx.streetcred.withOrg(orgId, ({ agency }) =>
        agency.createCredential(credential)
      );

      const { state, credentialId, schemaId } = walletCredential;

      // await WalletCredential.query().insert({
      //     credential_id: credentialId,
      //     user_id: user.id,
      //     org_id: orgId,
      //     schemaName: schemaId.split(':')[2],
      //     schemaVersion: schemaId.split(':')[3],
      //     state
      // })

      if (state) {
        await ctx.sender.notifyOfCredential({ user, organization });
        ctx.body = { state, credentialId, schemaId };
      }
    } catch (e) {
      ctx.error('Error issuing self check credential.', e);
      ctx.throw(418, 'something wrong issuing self check cred');
    }
  }

  /**
   * @description Sends credential offer of the specified DefinitionId to the specified ConnectionId
   * @abstract converted to straight API call.
   * @date 2020-04-14
   * @see https://docs.streetcred.id/agency#operation/CreateCredential
   */
  async function offerCredential(ctx, next) {
    const { credentialValues, connectionId, hostOrgId, patientId, testId } = ctx.request.body;
    if (!credentialValues || !hostOrgId || !patientId || !testId) ctx.throw(406);

    let orgId;

    try {
      let organization = await Organization.query().where({ name: 'MedCreds Network' }).first();
      orgId = hostOrgId ? hostOrgId : organization.id;

      if (organization.id !== orgId) {
        organization = await Organization.query().where({ id: orgId }).first();
      }

      User.knex(ctx.psql);
      Test.knex(ctx.psql);
      TestState.knex(ctx.psql);
      AgencyCredential.knex(ctx.psql);
      WalletCredential.knex(ctx.psql);

      const definitions = await ctx.streetcred.listCredentialDefinitions(hostOrgId);
      const definition = definitions.find(
        (def) => def.name === 'Certified Test Result' && def.version === '3.0'
      );

      if (!definition) ctx.throw(404, `no Certified Test Result 3.0 credential schema for orgId ${orgId}`);

      const { definitionId } = definition;

      const credential = {
        definitionId,
        automaticIssuance: true,
        connectionId,
        credentialValues
      };

      ctx.log('credentialOffer: ', credential.definitionId);

      try {
        const agencyCredential = await ctx.streetcred.withOrg(hostOrgId, ({ agency }) =>
          agency.createCredential(credential)
        );

        if (agencyCredential.state) {
          ctx.log('credentialOffered', agencyCredential.credentialId);
          const { credentialId, schemaId } = agencyCredential;
          const user = await User.query()
            .where({
              id: patientId
            })
            .withGraphFetched('[roles, tests, meetings, organizations, callbacks, events, wallets]')
            .first();

          await ctx.sender.notifyOfCredential({
            user,
            organization
          });

          await AgencyCredential.query().insert({
            credential_id: agencyCredential.credentialId,
            user_id: user.id,
            org_id: hostOrgId,
            schemaName: agencyCredential.schemaId.split(':')[2],
            schemaVersion: agencyCredential.schemaId.split(':')[3],
            state: agencyCredential.state
          });

          // await WalletCredential.query().insert({
          //     credential_id: agencyCredential.credentialId,
          //     user_id: user.id,
          //     org_id: hostOrgId,
          //     config: agencyCredential,
          //     schemaName: agencyCredential.schemaId.split(':')[2],
          //     schemaVersion: agencyCredential.schemaId.split(':')[3],
          //     state: agencyCredential.state
          // })

          const testState = await TestState.query().findOne({
            state: 'credential issued'
          });
          await Test.query()
            .patch({
              credential: {
                ...credentialValues,
                credentialId: agencyCredential.credentialId,
                credentialDateUtc: moment.utc().toISOString()
              },
              test_state_id: testState.id
            })
            .where({
              id: testId
            });

          await ctx.$metrics.log('credential issued', {
            fileName: __file,
            lineNumber: __line,
            user: {
              id: ctx.session.user.id
            },
            org: {
              id: hostOrgId
            },
            payload: {
              credentialId,
              schemaId
            }
          });

          delete user.password;
          ctx.body = user;
        }
      } catch (e) {
        ctx.error(e);
        ctx.throw(408, e);
      }
    } catch (e) {
      ctx.error(e);
      ctx.throw(412, e);
    }
  }

  async function deleteCredential(ctx, next) {
    const { hostOrgId } = ctx.params;

    const { credentialId } = ctx.request.query;

    if (hostOrgId) {
      const response = await ctx.streetcred.withOrg(hostOrgId, ({ agency }) =>
        agency.deleteCredential(credentialId)
      );
      ctx.body = response;
    } else {
      ctx.throw(400);
    }
  }

  /**
   * @description Get the verification with the given identifier
   * @date 2020-04-04
   * @see https://docs.streetcred.id/agency#operation/GetVerification
   */
  async function getVerification(ctx, next) {
    Organization.knex(ctx.psql);

    const { verificationId } = ctx.params;
    let { hostOrgId } = ctx.request.query; //optional

    withers.withRootOrg((org) => {
      hostOrgId = hostOrgId || org.id;
    });

    if (!verificationId || !hostOrgId) {
      ctx.throw(400);
    } else {
      const org = { id: hostOrgId };

      const response = await ctx.streetcred.withOrg(hostOrgId, ({ agency }) =>
        agency.getVerification(verificationId)
      );
      await ctx.$metrics.log('verification succeeded', {
        // fileName: __file,
        // lineNumber: __line,
        verificationId,
        org
      });
      ctx.body = response;
    }
  }

  /**
   * @description Lists the verification policies at RootOrg or by OrgId
   * @date 2020-04-20
   * @see https://docs.streetcred.id/agency#operation/ListVerificationPolicies
   */
  async function listVerificationPolicies(ctx, next) {
    const { hostOrgId } = ctx.request.query;
    ctx.body = await ctx.streetcred.listVerificationPolicies(hostOrgId);
  }

  logRoutes(router);

  return router;
};
