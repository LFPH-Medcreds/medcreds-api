const assert = require('assert');
const axios = require('axios');
const withers = require('./withers');
const NodeCache = require('node-cache');
const { WEBHOOK_BASE, STREETCRED_TENANT_ID } = require('../config');

const { Credentials, CredentialsServiceClient, WalletServiceClient } = require('@trinsic/service-clients');

const { Organization } = require('../models');

const schemas = require('../schemas');
const proofs = require('../proofs');

const trinsicCache = new NodeCache({ stdTTL: 60 });


function withOrg(orgId, doIt) {
  return withers.withOrg(orgId, async (org) => {
    org = org.parentOrgId ? await withers.withOrg(org.parentOrgId) : org;

    if (org.hasStreetcred) {
      if (!org.config.streetcred) debugger;
      const client = createClients(org.config.streetcred);
      return doIt({
        client: client.rest,
        restCredentials: client.restCredentials,
        custodian: client.custodian,
        org,
        agency: client.scAgency,
        custody: client.scCustody
      });
    }
  });
}

async function withRootOrg(doIt) {
  return withers.withRootOrg((org) => withOrg(org.id, doIt));
}

function createClients({ apiKey, subscriptionId }) {
  return {
    rest: axios.create({
      baseURL: 'https://api.trinsic.id/credentials/v1',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }),
    restCredentials: axios.create({
      baseURL: 'https://api.trinsic.id/credentials/v1',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }),
    scAgency: new CredentialsServiceClient(new Credentials(apiKey)),
    scCustody: new WalletServiceClient(new Credentials(apiKey)),
    custodian: axios.create({
      baseURL: 'https://api.trinsic.id/wallet/v1',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }),
    sc: new CredentialsServiceClient(new Credentials(apiKey))
  };
}

const findSchemaId = async (client, name, version) => {
  const { data } = await client.get('/definitions/schemas');
  const schema = data.find((schema) => schema.name === name && schema.version === version);
  if (schema) {
    return schema.id;
  }
};

const findPolicyId = async (client, name, version) => {
  const { data } = await client.get('/verificationPolicies');
  const policy = data.find((policy) => policy.name === name && policy.version === version);
  if (policy) {
    return policy.policyId;
  }
};

async function setupCredentialDefinitions({ org, schemas }) {
  for (const name in schemas) {
    for await (const version of Object.keys(schemas[name])) {
      const { attributeNames, supportRevocation, tag } = schemas[name][version];
      const schema = schemas[name][version];

      try {
        const schemaId = await withRootOrg(async ({ client: rootClient }) => {
          let result = await findSchemaId(rootClient, name, version);
          if (!result) {
            const response = await rootClient.post('/definitions/schemas', {
              name,
              version,
              attributeNames,
              supportRevocation: supportRevocation,
              tag
            });
            result = response && response.data;
            console.info(`Schema created ${name} ${version} ${result}`);
          } else {
            console.info(`Schema exists ${name} ${version} ${result}`);
          }
          return result;
        });

        schema.schemaId = schemaId;
        schema.issuerDid = schemaId.split(':')[0];

        await withOrg(org.id, async ({ client, agency }) => {
          let list = await agency.listCredentialDefinitions();
          const def = list.find((it) => it.schemaId === schemaId);
          if (def) {
            console.info(`Definition exists ${def.definitionId}`);
          } else {
            const options = {
              supportRevocation: supportRevocation,
              tag
            };
            let response = await client.post(`/definitions/credentials/${encodeURI(schemaId)}`, options);
            assert(response.status == 200);
            const { definitionId } = response.data;
            console.info(`Definition created ${name} ${version} ${definitionId}`);
          }
        });
      } catch (err) {
        console.error(`Error creating credential definition ${name} ${version} ${err}`);
      }
    }
  }
}

function fixSchemaIds(res, schemas) {
  if (res.schemaId) {
    let list = res.schemaId.split(':');
    if (list.length > 2) {
      list = list.slice(2, 4);
    }
    res.schemaId = schemas[list[0]][list[1]].schemaId;
  }
  if (res.schemaIssuerDid) {
    let list = res.schemaIssuerDid.split(':');
    if (list.length > 2) {
      list = list.slice(2, 4);
    }
    res.schemaIssuerDid = schemas[list[0]][list[1]].schemaIssuerDid;
  }
}

async function setupVerificationPolicies({ org, schemas, proofs }) {
  for (const name in proofs) {
    const versions = Object.keys(proofs[name]);
    for await (const version of versions) {
      const { attributes, predicates, revocationRequirement } = proofs[name][version];
      withOrg(org.id, async ({ client, agency }) => {
        let policyId = await findPolicyId(client, name, version);
        if (!policyId) {
          for (const policy of attributes) {
            policy.restrictions.forEach((it) => fixSchemaIds(it, schemas));
          }

          for (const pred of predicates) {
            pred.restrictions.forEach(fixSchemaIds);
          }

          const response = await agency.createVerificationPolicy({
            verificationPolicyParameters: {
              name,
              version,
              attributes,
              revocationRequirement
            }
          });
          policyId = response.policyId;
          console.info(`Policy created ${name} ${version} ${policyId}`);
        } else {
          console.info(`Policy exists ${name} ${version} ${policyId}`);
        }
        proofs[name][version].policyId = policyId;
      });
    }
  }
}

async function setupWebhooks({ org }) {
  return withOrg(org.id, async ({ agency }) => {
    let list = await agency.listWebhooks();
    if (list.length < 1) {
      const hookId = (
        await agency.createWebhook({
          webhookParameters: {
            type: 'Notification',
            url: `${WEBHOOK_BASE}${org.config.streetcred.tenantId}`
          }
        })
      ).id;
      console.info(`Webhook created ${hookId}`);
    } else {
      console.info(`Webhook exists ${list[0].id}`);
    }
  });
}

async function dropCredentialDefinitions({ org, schemas }) {
  let promises = [];
  let list = await withOrg(org.id, ({ agency }) => agency.listCredentialDefinitions());
  for (const definition of list) {
    for (const name in schemas) {
      for (const ver in schemas[name]) {
        if (definition.name == name && definition.version == ver) {
          console.info(`Dropping definition ${definition.definitionId}`);
          promises.push(
            withOrg(org.id, ({ agency }) => agency.deleteCredentialDefinition(definition.definitionId))
          );
        }
      }
    }
  }
  await Promise.all(promises);
}

async function dropVerificationPolicies({ org, proofs }) {
  let promises = [];
  let list = await withOrg(org.id, ({ agency }) => agency.listVerificationPolicies());
  for (const policy of list) {
    for (const proof in proofs) {
      for (const ver in proofs[proof]) {
        if (policy.name == proof && policy.version == ver) {
          console.info(`Dropping policy ${policy.policyId}`);
          promises.push(withOrg(org.id, ({ agency }) => agency.deleteVerificationPolicy(policy.policyId)));
        }
      }
    }
  }
  await Promise.all(promises);
}

async function dropWebhooks({ org }) {
  return withOrg(org.id, async ({ agency }) => {
    let promises = [];
    let list = await agency.listWebhooks();
    for (const hook of list) {
      console.info(`Dropping webhook ${hook.id}`);
      promises.push(agency.removeWebhook(hook.id));
    }
    list = await Promise.all(promises).then(() => agency.listWebhooks());
    assert(!list.length);
  });
}

async function provision(org) {
  await setupCredentialDefinitions({ org, schemas, proofs });
  await setupVerificationPolicies({ org, schemas, proofs });
  await setupWebhooks({ org });
}

async function deprovision(org) {
  await dropCredentialDefinitions({ org, schemas, proofs });
  await dropVerificationPolicies({ org, schemas, proofs });
  await dropWebhooks({ org });
}

const listCredentialDefinitions = async (orgId) => {
  const cacheKey = `listCredentialDefinitions:${orgId}`;
  let definitions = trinsicCache.get(cacheKey);
  if (!definitions) {
    definitions = await withOrg(orgId, ({ agency }) => agency.listCredentialDefinitions());
    trinsicCache.set(cacheKey, definitions);
  }

  return definitions;
};

const listVerificationPolicies = async (orgId) => {
  const cacheKey = `listVerificationPolicies:${orgId}`;
  let policies = trinsicCache.get(cacheKey);
  if (!policies) {
    policies = !orgId
      ? await withRootOrg(({ agency }) => agency.listVerificationPolicies())
      : await withOrg(orgId, ({ agency }) => agency.listVerificationPolicies());

    trinsicCache.set(cacheKey, policies);
  }

  return policies;
};

const getVerificationPolicy = async (orgId, policyId) => {
  const cacheKey = `getVerificationPolicy:${orgId}`;
  let policy = trinsicCache.get(cacheKey);
  if (!policy) {
    const { data } = await withOrg(orgId, ({ client }) => client.get(`/verificationPolicies/${policyId}`));

    policy = data;
    trinsicCache.set(cacheKey, policy);
  }

  return policy;
};

module.exports = (psql) => {
  Organization.knex(psql);
  return {
    getVerificationPolicy,
    listVerificationPolicies,
    listCredentialDefinitions,
    deprovision,
    provision,
    withRootOrg,
    withOrg
  };
};
