const { Credentials, CredentialsServiceClient } = require('@trinsic/service-clients');

const { Organization } = require('../../models');

const { hasRole } = require('../../util');
const withers = require('../../services/withers');

/**
 * @deprecated see listVerificationPolicies
 * @description List all verfication definition for the organizaton
 * @date 2020-04-04
 * @see https://docs.streetcred.id/agency#operation/ListVerificationDefinitions
 */
async function listVerificationDefinitions(ctx, next) {
  ctx.body = await client.listVerificationDefinitions({});
}

/**
 * @description List the verification associated with a connection
 * @date 2020-04-04
 * @see https://docs.streetcred.id/agency#operation/ListVerificationsForConnection
 * Optional querystring params: connectionId, hostOrgId
 */
async function listVerificationsForConnection(ctx, next) {
  Organization.knex(ctx.psql);
  let { hostOrgId, connectionId } = ctx.request.query;

  // allow passing in hostOrgId, but default to rootOrgId
  const rootOrg = await Organization.query()
    .where({
      name: 'MedCreds.com'
    })
    .first();

  hostOrgId = hostOrgId || rootOrg.id;

  let response = null;

  if (!hostOrgId) {
    ctx.throw(400);
  } else {
    if (!connectionId) {
      response = await client.listVerificationsForConnection();
    } else {
      response = await client.listVerificationsForConnection({
        connectionId
      });
    }
  }
  ctx.body = response;
}

/**
 * @deprecated NOTE: this is being phased out in favour of policy based verifications. see createVerificationPolicy
 * @description This endpoint can be used to send a verification definition to a connection, which will create a verification ID to track the response from the connection.
 * @date 2020-04-04
 * @see https://docs.streetcred.id/docs/verifications#create-a-verification
 */
async function createVerification(ctx, next) {
  const options = {
    verificationParameters: {
      verificationDefinitionId: ctx.request.body.verificationDefinitionId
    }
  };

  if (!ctx.request.body.connectionId) ctx.body = await client.createVerification(options);
  else {
    options.verificationParameters.connectionId = ctx.request.body.connectionId;
    ctx.body = await client.createVerification(options);
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
 * @description Delete Verification by Id
 * @date 2020-04-04
 * @see https://docs.streetcred.id/agency#operation/DeleteVerification
 */
async function deleteVerification(ctx, next) {
  const { verificationId } = ctx.params;
  const { hostOrgId } = ctx.request.query; //optional
  let response = {};

  if (!hostOrgId) {
    response = await ctx.streetcred.withRootOrg(({ agency }) => agency.deleteVerification(verificationId));
  } else {
    response = await ctx.streetcred.withOrg(hostOrgId, ({ agency }) =>
      agency.deleteVerification(verificationId)
    );
  }
  ctx.body = response;
}

/**
 * @deprecated see createVerificationPolicy
 * @description A verification definition is created and saved on your cloud agent.
 * @date 2020-04-04
 * @see https://docs.streetcred.id/agency#operation/CreateVerificationDefinition
 */
async function createVerificationDefinition(ctx, next) {
  const { proofRequest } = ctx.request.body;
  ctx.body = await client.createVerificationDefinition({
    proofRequest
  });
}

//
// NOTE:  New Policy based verifications
//

/**
 * @description Lists the verification policies at RootOrg or by OrgId
 * @date 2020-04-20
 * @see https://docs.streetcred.id/agency#operation/ListVerificationPolicies
 */
async function listVerificationPolicies(ctx, next) {
  const { hostOrgId } = ctx.request.query;
  ctx.body = await ctx.streetcred.listVerificationPolicies(hostOrgId);
}

/**
 * @description Gets the specified verification policy.
 * @date 2020-04-20
 * @see https://docs.streetcred.id/agency#operation/GetVerificationPolicy
 */
async function getVerificationPolicy(ctx, next) {
  const { policyId } = ctx.params;

  if (policyId) {
    const policies = await client.getVerificationPolicy(policyId);
    ctx.body = policies;
  } else {
    ctx.throw(400);
  }
}

/**
 * @description Creates a new verification policy.
 * @date 2020-04-20
 * @see https://docs.streetcred.id/agency#operation/CreateVerificationPolicy
 */
async function createVerificationPolicy(ctx, next) {
  const { name, version, attributes, predicates, revocationRequirement } = ctx.request.body;
  if (name && version && attributes) {
    const verificationPolicyParameters = {
      name,
      version,
      attributes
    };

    if (predicates) {
      verificationPolicyParameters.predicates = predicates;
    }
    if (revocationRequirement) {
      verificationPolicyParameters.revocationRequirement = revocationRequirement;
    }

    const policy = await client.createVerificationPolicy({
      verificationPolicyParameters
    });
    ctx.body = policy;
  } else {
    ctx.throw(400);
  }
}

/**
 * @description Create a verification from existing policy used for connectionless transport. \nConnectionless transport uses URLs that can be shared with the user over any existing transport (email, SMS, web).
 * @date 2020-04-20
 * @see https://docs.streetcred.id/agency#operation/CreateVerificationFromPolicy
 */
async function createVerificationFromPolicy(ctx, next) {
  const { policyId, hostOrgId } = ctx.params;

  if (policyId) {
    try {
      const response = await ctx.streetcred.withOrg(hostOrgId, ({ agency }) =>
        agency.createVerificationFromPolicy(policyId)
      );
      await ctx.$metrics.log('verification requested', {
        fileName: __file,
        lineNumber: __line,
        user: { id: ctx.session.user.id },
        org: { id: hostOrgId },
        payload: {
          verificationId: response.verificationId
        }
      });

      ctx.body = response;
    } catch (error) {
      ctx.error('Error creating verification from policy.', error);
      ctx.$metrics.log('error', {
        fileName: __file,
        lineNumber: __line,
        payload: { error }
      });
      ctx.throw(500);
    }
  } else {
    ctx.throw(400);
  }
}

/**
 * @description Send a verification to the specified connection from existing policy
 * @date 2020-04-27
 * @see https://docs.streetcred.id/agency#operation/SendVerificationFromPolicy
 */
async function createVerificationFromPolicyForConnection(ctx, next) {
  const { policyId, connectionId } = ctx.params;
  if (policyId && connectionId) {
    const response = await client.sendVerificationFromPolicy(connectionId, policyId);
    ctx.body = response;
  } else {
    ctx.throw(400);
  }
}

module.exports = {
  listVerificationDefinitions,
  listVerificationsForConnection,
  createVerification,
  getVerification,
  deleteVerification,
  createVerificationDefinition,
  listVerificationPolicies,
  getVerificationPolicy,
  createVerificationPolicy,
  createVerificationFromPolicy,
  createVerificationFromPolicyForConnection
};
