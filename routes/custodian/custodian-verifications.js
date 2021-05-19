const { User, Organization, Event } = require('../../models');

/**
 * @description Lists all the verifications in the wallet.
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/ListVerifications
 */
async function listVerifications(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId, walletId } = ctx.params;

  if (hostOrgId && walletId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) =>
      custody.listVerifications(walletId)
    );

    const org = await Organization.query().findOne({
      id: hostOrgId
    });
    // const event = verification && verification.listVerifications && await Event.query().findOne({
    //   type: 'listVerifications succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

/**
 * @description Lists the verifications for connection.
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/ListVerificationsForConnection
 */
async function listVerificationsForConnection(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId, walletId, connectionId } = ctx.params;

  if (hostOrgId && walletId && connectionId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) =>
      custody.listVerificationsForConnection(walletId, connectionId)
    );

    const org = await Organization.query().findOne({
      id: hostOrgId
    });
    // const event = verification && verification.listVerificationsForConnection && await Event.query().findOne({
    //   type: 'listVerificationsForConnection succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

/**
 * @description Retrieve a verification with the given identifier.
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/GetVerification
 */
async function getVerification(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId, walletId, verificationId } = ctx.params;

  if (hostOrgId && walletId && verificationId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) =>
      custody.getVerification(walletId, verificationId)
    );

    const org = await Organization.query().findOne({
      id: hostOrgId
    });
    // const event = verification && verification.getVerification && await Event.query().findOne({
    //   type: 'getVerification succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

/**
 * @description Get a list of available credentials for a given verification
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/GetAvailableCredentialsForVerification
 */
async function getAvailableCredentialsForVerification(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId, walletId, verificationId } = ctx.params;

  if (hostOrgId && walletId && verificationId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) =>
      custody.getAvailableCredentialsForVerification(walletId, verificationId)
    );

    const org = await Organization.query().findOne({
      id: hostOrgId
    });
    // const event = verification && verification.getAvailableCredentialsForVerification && await Event.query().findOne({
    //   type: 'getAvailableCredentialsForVerification succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

/**
 * @description Submit verification using the provided policy parameters
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/SubmitVerification
 */
async function submitVerification(ctx, next) {
  Event.knex(ctx.psql);
  Organization.knex(ctx.psql);

  const { hostOrgId, walletId, verificationId } = ctx.params;

  const { verificationPolicyCredentialParametersArray } = ctx.request.body;

  if (hostOrgId && walletId && verificationId && verificationPolicyCredentialParametersArray) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) =>
      custody.submitVerification(walletId, verificationId, verificationPolicyCredentialParametersArray)
    );

    const org = await Organization.query().findOne({
      id: hostOrgId
    });
    // const event = verification && verification.submitVerification && await Event.query().findOne({
    //   type: 'submitVerification succeeded'
    // })

    // if (event) await event.$relatedQuery('organizations').relate(org)
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

/**
 * @description If a credential is not available for a certain policy, that policy will not be included in the submitted verification.
 * @date 2020-05-10
 * @see https://docs.streetcred.id/custodian#operation/SubmitVerificationAutoSelect
 */
async function submitVerificationAutoSelect(ctx, next) {
  const { hostOrgId, walletId, verificationId } = ctx.params;

  if (hostOrgId && walletId && verificationId) {
    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) =>
      custody.submitVerificationAutoSelect(walletId, verificationId)
    );

    await ctx.$metrics.log('verification approved', {
      fileName: __file,
      lineNumber: __line,
      user: { id: ctx.session.user.id },
      org: { id: hostOrgId },
      payload: {
        verificationId,
        walletId
      }
    });

    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

async function submitVerificationFromDataAutoSelect(ctx, next) {
  const { hostOrgId, walletId } = ctx.params;

  const { verificationData } = ctx.request.body;

  if (hostOrgId && walletId && verificationData) {
    // const c = await client.submitVerificationFromDataAutoSelect(walletId, verificationData)

    const response = await ctx.streetcred.withOrg(hostOrgId, ({ custody }) =>
      custody.submitVerificationFromDataAutoSelect(walletId, verificationData)
    );

    await ctx.$metrics.log('verification approved', {
      fileName: __file,
      lineNumber: __line,
      user: { id: ctx.session.user.id },
      org: { id: hostOrgId },
      payload: {
        verificationData,
        walletId
      }
    });

    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

module.exports = {
  listVerifications,
  listVerificationsForConnection,
  getVerification,
  getAvailableCredentialsForVerification,
  submitVerification,
  submitVerificationAutoSelect,
  submitVerificationFromDataAutoSelect
};
