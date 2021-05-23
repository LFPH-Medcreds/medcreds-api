const {
  listConnections,
  makeConnection,
  getConnection,
  deleteConnection
} = require('./ssi/agency-connections');

const {
  listCredentialDefinitions,
  offerCredential,
  issueTemp,
  issueSelfCheck,
  createCredentialDefinition,
  createCredentialDefinitionForSchemaId,
  listCredentials,
  deleteCredential,
  getCredential
} = require('./ssi/agency-creds');

const { listTenants, getTenant, getHealth } = require('./ssi/sc-admin');

const {
  listVerificationDefinitions,
  listVerificationsForConnection,
  // createVerification,
  verifyVerification,
  getVerification,
  deleteVerification,
  createVerificationDefinition,
  listVerificationPolicies,
  getVerificationPolicy,
  createVerificationPolicy,
  createVerificationFromPolicy,
  createVerificationFromPolicyForConnection
} = require('./ssi/agency-verifications');

const router = require('koa-router')();
const { logRoutes } = require('../src/util');

module.exports = () => {
  // TODO: Do we start combining some of the DB code into these endpoints too
  //router.get('/connections', listConnections);
  router.post('/connections', makeConnection);
  //router.delete('/connection/:hostOrgId', deleteConnection);
  //router.get('/connection/:hostOrgId/:connectionId', getConnection);

  // NOTES: Consolidated endpoint into one method
  // router.get('/credentials/:hostOrgId', listCredentials)
  router.delete('/credentials/:hostOrgId', deleteCredential);
  router.post('/credentials/temp', issueTemp);
  router.post('/credentials/selfcheck', issueSelfCheck);
  //router.get('/credentials/:credentialId', getCredential);
  router.post('/credentials', offerCredential);
  router.get('/credentials/definitions/:hostOrgId', listCredentialDefinitions);
  //router.post('/credentials/:hostOrgId/definitions', createCredentialDefinition); // cred schema

  //router.post('/credentials/:hostOrgId/definitionfromschema', createCredentialDefinitionForSchemaId); // cred schema

  // router.post('/verifications/create', createVerification) // DEPRECATED: connectionId + verificationId

  //router.get('/verifications/definitions', listVerificationDefinitions);
  // router.post('/verifications/definitions', createVerificationDefinition) // DEPRECATED:

  // NEW: new methods on SC - April 2020
  router.get('/verifications/policies', listVerificationPolicies);
  //router.post('/verifications/policies', createVerificationPolicy);

  //router.get('/verifications/policies/:policyId', getVerificationPolicy);
  //router.put('/verifications/policies/:policyId/:hostOrgId', createVerificationFromPolicy);
  /*router.put(
    '/verifications/policies/:policyId/connections/:connectionId',
    createVerificationFromPolicyForConnection
  );
*/
  // Support optional Org centric requests
  //router.get('/verifications', listVerificationsForConnection); // query connectionId?, hostOrgId?
  router.get('/verifications/:verificationId', getVerification); // query hostOrgId?
  //router.delete('/verifications/:verificationId', deleteVerification); // query hostOrgId?

  logRoutes(router);

  return router;
};