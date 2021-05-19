const { User, Organization, WalletCredential, WalletConnection } = require('../models');
const { withOrg } = require('../services/withers');
const { UserRefreshClient } = require('google-auth-library');

module.exports = async (knex) => {
  User.knex(knex);
  Organization.knex(knex);
  WalletCredential.knex(knex);
  WalletConnection.knex(knex);
  const $streetcred = require('../services/streetcred')(knex);

  process.stdout.write('starting re-seed of credentials and connections \n');

  const users = await User.query().withGraphFetched('[roles, organizations, wallets]');

  for await (const user of users) {
    const walletId = user.wallets && user.wallets.length && user.wallets[user.wallets.length - 1].wallet_id;
    if (!walletId) {
      console.error('user has no wallet', user.wallets);
      continue;
    } else if (user.email == 'lex+patient@proofmarket.io') {
      console.log('skipping lex+patient account as it was hanging');
      continue;
    } else {
      let connections;
      let credentials;
      try {
        try {
          const { data } = await $streetcred.withRootOrg(({ custody, custodian }) =>
            custodian.get(`/api/${walletId}/connections`)
          ); // custody.getConnections(walletId))
          connections = data;
        } catch (e) {
          console.error('skipping bad wallet');
          continue;
        }
        try {
          const { data } = await $streetcred.withRootOrg(({ custody, custodian }) =>
            custodian.get(`/api/${walletId}/credentials`)
          ); // custody.listCredentials(walletId))
          credentials = data;
        } catch (e) {
          console.error('skipping bad wallet');
          continue;
        }

        console.log(user.email, connections && connections.length, credentials && credentials.length);
        // console.table(connections)
        // console.log('Credentials')
        // console.table(credentials)
        // console.log(credentials.values)
        try {
          if (credentials && credentials.length) {
            for await (const credential of credentials) {
              const { credentialId, state, schemaId } = credential;
              const existing = await WalletCredential.query().findOne({
                credential_id: credentialId
              });
              if (existing) console.log('skipping duplicate credential');
              if (!existing) {
                const cred = await WalletCredential.query().insert({
                  user_id: user.id,
                  credential_id: credentialId,
                  state,
                  schema_name: schemaId.split(':')[2],
                  schema_version: schemaId.split(':')[3]
                });
                console.log('created credential', cred);
              }
            }
          }
        } catch (e) {
          console.error('error creating credential', e);
        }

        // // console.table(connections)
        try {
          if (connections && connections.length) {
            for await (let connection of connections) {
              const { connectionId, state, name } = connection;
              const existing = await WalletConnection.query().findOne({
                connection_id: connectionId
              });
              if (existing) console.log('skipping duplicate connection');
              if (!existing) {
                connection = {
                  user_id: user.id,
                  connection_id: connectionId,
                  state,
                  config: connection
                };
                const org = await Organization.query().findOne({ name });
                if (org) connection.org_id = org.id;
                const conn = await WalletConnection.query().insert(connection);
                console.log('created connection', conn);
              }
            }
          }
        } catch (e) {
          console.error('error creating connection', e);
        }
      } catch (e) {
        console.error('unable to fetch wallet details');
        console.error(e);
      }
    }
  }

  // we need to fetch all User.roles and assign them to the
};
