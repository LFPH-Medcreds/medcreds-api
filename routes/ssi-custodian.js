const {
  getConnection,
  getConnections,
  acceptInvitation,
  getInvitations
} = require('./custodian/custodian-connections');

const { createWallet, listWallets, deleteWallet } = require('./custodian/custodian-wallets');

const {
  listCredentials,
  listCredentialsForConnectionId,
  getCredential,
  acceptCredentialOffer
} = require('./custodian/custodian-credentials');

const {
  listVerifications,
  listVerificationsForConnection,
  getVerification,
  getAvailableCredentialsForVerification,
  submitVerification,
  submitVerificationAutoSelect,
  submitVerificationFromDataAutoSelect
} = require('./custodian/custodian-verifications');

const router = require('koa-router')();
const { logRoutes } = require('../src/util');

module.exports = () => {
  //router.get('/custodian/:hostOrgId/wallets', listWallets);
  //router.post('/custodian/:hostOrgId/wallets', createWallet);
  //router.delete('/custodian/:hostOrgId/wallets', deleteWallet);

  //router.post('/custodian/:hostOrgId/connections/:walletId/invitation', acceptInvitation);
  //router.get('/custodian/:hostOrgId/connections/:walletId/invitations', getInvitations);
  //router.get('/custodian/:hostOrgId/connections/:walletId', getConnections);
  //router.get('/custodian/:hostOrgId/connection/:walletId/:connectionId', getConnection);

  //router.get('/custodian/:hostOrgId/credentials/:walletId/:connectionId', listCredentialsForConnectionId);
  //router.get('/custodian/:hostOrgId/credentials/:walletId', listCredentials);
  //router.get('/custodian/:hostOrgId/credential/:walletId/:credentialId', getCredential);
  //router.post('/custodian/:hostOrgId/credential/:walletId/:credentialId', acceptCredentialOffer);

  //router.get('/custodian/:hostOrgId/verifications/:walletId', listVerifications);
  /*router.get(
    '/custodian/:hostOrgId/verifications/:walletId/connection/:connectionId',
    listVerificationsForConnection
  );*/
  //router.get('/custodian/:hostOrgId/verification/:walletId/:verificationId', getVerification);
  /*router.get(
    '/custodian/:hostOrgId/verification/:walletId/:verificationId/availableCredentials',
    getAvailableCredentialsForVerification
  );*/
  //router.put('/custodian/:hostOrgId/verification/:walletId/:verificationId', submitVerification);
  /*router.put(
    '/custodian/:hostOrgId/verification/:walletId/:verificationId/autoSelect',
    submitVerificationAutoSelect
  );*/
  /*router.put(
    '/custodian/:hostOrgId/verification/:walletId/fromData/autoSelect',
    submitVerificationFromDataAutoSelect
  );*/

  logRoutes(router);

  return router;
};
