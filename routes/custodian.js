// all response variables named below are aligned with Models outlined
// https://app.swaggerhub.com/apis-docs/Streetcred/custodian/v1#/

const router = require('koa-router')();
const { logRoutes } = require('../util');

module.exports = ({ psql }) => {
  // WALLET CREATION AND FETCHING ACTIONS -> https://app.swaggerhub.com/apis-docs/Streetcred/custodian/v1#/Wallet
  //router.get('/custodian/wallets', listWallets);
  //router.post('/custodian/wallets', createWallet);
  //router.delete('/custodian/wallets', deleteWallet);

  async function listWallets(ctx, next) {
    const { data: custodianWalletContracts } = await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.get('/api/wallets')
    );
    ctx.body = custodianWalletContracts;
  }

  async function createWallet(ctx, next) {
    const { name: ownerName } = ctx.request.body;
    // intentionally not passing a walletId on creation as we want to generat a new unique one
    const { data: custodianWalletContract } = await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.post('/api/wallets', { ownerName })
    );
    ctx.body = custodianWalletContract;
  }

  async function deleteWallet(ctx, next) {
    const { walletId } = ctx.request.body;
    await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.delete(`/api/wallets?walletId=${walletId}`)
    );
    ctx.status = 200;
  }

  // WALLET CREDENTIAL ACTIONS -> https://app.swaggerhub.com/apis-docs/Streetcred/custodian/v1#/Credentials
  //router.post('/custodian/credentials', acceptCredential);
  //router.get('/custodian/credentials/:walletId/:connectionId', listCredentialsForConnection);
  //router.get('/custodian/credentials/:walletId', listCredentials);
  router.get('/custodian/credential/:walletId/:credentialId', getCredentialDetails);

  async function acceptCredential(ctx, next) {
    const { walletId, credentialId } = ctx.request.body;
    await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.post(`/api/${walletId}/credentials/${credentialId}`)
    );
    ctx.status = 200;
  }

  async function getCredentialDetails(ctx, next) {
    const { walletId, credentialId } = ctx.params;
    try {
      const { data: credentialContracts } = await ctx.streetcred.withRootOrg(({ custodian }) =>
        custodian.get(`/api/${walletId}/credentials/${credentialId}`)
      );
      ctx.body = credentialContracts;
    } catch (e) {
      ctx.body = { policy: { name: 'Error fetching credential ' } };
      ctx.error('Error fetching credential.', e);
    }
  }

  async function listCredentials(ctx, next) {
    const { walletId } = ctx.params;
    const { data: credentialContracts } = await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.get(`/api/${walletId}/credentials`)
    );
    ctx.body = credentialContracts;
  }

  async function listCredentialsForConnection(ctx, next) {
    const { connectionId, walletId } = ctx.params;
    const { data: credentialContracts } = await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.get(`/api/${walletId}/credentials/connection/${connectionId}`)
    );
    ctx.body = credentialContracts;
  }

  // WALLET CONNECTION ACTIONS -> https://app.swaggerhub.com/apis-docs/Streetcred/custodian/v1#/Connection
  //router.post('/custodian/connections/invitation', acceptInvitation);
  //router.get('/custodian/connections/invitations', listInvitations);
  //router.get('/custodian/connections/:connectionId', getConnectionDetails);
  //router.get('/custodian/connections', listConnections);

  async function acceptInvitation(ctx, next) {
    const { invitation, walletId } = ctx.request.body;
    const { data: connectionContract } = await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.post(`/api/${walletId}/connections/invitation`, {
        invitation
      })
    );
    ctx.body = connectionContract;
  }

  async function listConnections(ctx, next) {
    const { walletId } = ctx.request.body;
    const { data: connectionContracts } = await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.get(`/api/${walletId}/connections`)
    );
    ctx.body = connectionContracts;
  }

  async function getConnectionDetails(ctx, next) {
    const { walletId } = ctx.request.body;
    const { connectionId } = ctx.params;
    const { data: connectionContract } = await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.get(`/api/${walletId}/connections/${connectionId}`)
    );
    ctx.body = connectionContract;
  }

  async function listInvitations(ctx, next) {
    const { walletId } = ctx.request.body;
    const { data: connectionContracts } = await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.get(`/api/${walletId}/connections/invitations`)
    );
    ctx.body = connectionContracts;
  }

  // WALLET VERIFICATION ACTIONS -> https://app.swaggerhub.com/apis-docs/Streetcred/custodian/v1#/Verification
  //router.get('/custodian/verifications/:walletId', listVerifications);
  //router.get('/custodian/verifications/connection/:connectionId/:walletId', listVerificationsForConnection);
  //router.get('/custodian/verifications/:walletId/:verificationId', getVerificationDetails);
  /*router.get(
    '/custodian/verifications/:walletId/:verificationId/availableCredentials',
    listCredentialsForVerification
  );*/
  //router.put('/custodian/verifications/:walletId/:verificationId', submitVerificationWithPolicy);
  /*router.put(
    '/custodian/verifications/:walletId/:verificationId/autoSelect',
    submitVerificationWithAutoselect
  );*/

  async function listVerifications(ctx, next) {
    const { walletId } = ctx.params;
    const { data: verificationContracts } = await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.get(`/api/${walletId}/verifications`)
    );
    ctx.body = verificationContracts;
  }

  async function listVerificationsForConnection(ctx, next) {
    const { connectionId, walletId } = ctx.params;
    const { data: verificationContracts } = await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.get(`/api/${walletId}/verifications/connection/${connectionId}`)
    );
    ctx.body = verificationContracts;
  }

  async function getVerificationDetails(ctx, next) {
    const { verificationId, walletId } = ctx.params;
    const { data: verificationContract } = await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.get(`/api/${walletId}/verifications/${verificationId}`)
    );
    ctx.body = verificationContract;
  }

  async function listCredentialsForVerification(ctx, next) {
    const { verificationId, walletId } = ctx.params;
    const {
      data: verificationPolicyCredentialContracts
    } = await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.get(`/api/${walletId}/verifications/${verificationId}/availableCredentials`)
    );
    ctx.body = verificationPolicyCredentialContracts;
  }

  async function submitVerificationWithPolicy(ctx, next) {
    const { verificationId, walletId } = ctx.params;
    const { verificationPolicyCredentialParametersArray } = ctx.request.body;
    await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.put(
        `/api/${walletId}/verifications/${verificationId}`,
        verificationPolicyCredentialParametersArray
      )
    );
    ctx.status = 200;
  }

  async function submitVerificationWithAutoselect(ctx, next) {
    const { verificationId, walletId } = ctx.params;
    await ctx.streetcred.withRootOrg(({ custodian }) =>
      custodian.put(`/api/${walletId}/verifications/${verificationId}/autoSelect`)
    );
    ctx.status = 200;
  }

  logRoutes(router);

  return router;
};
