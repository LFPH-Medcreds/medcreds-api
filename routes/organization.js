const router = require('koa-router')();

const {
  Organization,
  Role,
  User,
  Callback,
  Event,
  Verification,
  OrgConnections,
  Test
} = require('../models');

const moment = require('moment');
const { DateTime } = require('luxon');

const { logRoutes, rbac } = require('../src/util');
const {
  mapVerificationDto,
  mapOrganizationConnectionDto,
  mapOrganizationDto
} = require('../services/mappers.js');

module.exports = ({ psql, knex }) => {
  User.knex(psql);
  Organization.knex(psql);
  Callback.knex(psql);
  Event.knex(psql);
  Test.knex(psql);
  Verification.knex(psql);
  OrgConnections.knex(psql);

  router.get('/organizations/patients', getPatients);
  router.get('/organizations/verified', getVerifiedUsers);
  router.patch('/organizations/:hostOrgId/users/:email', patchOrgUser);
  router.delete('/organizations/:hostOrgId/users/:email', deleteOrgUser);
  router.get('/organizations', getOrgs);
  router.get('/organizations/:id', getOrg);
  router.post('/organizations', rbac('root'), postOrg);
  router.post('/organizations/:id/provision', rbac('root'), provisionOrg);
  router.put('/organizations/:id', rbac('root'), putOrg);
  router.delete('/organizations/:id', rbac('root'), deleteOrg);
  router.get('/organizations/wallet/:hostOrgId', getOrgWallet);

  async function deleteOrgUser(ctx, next) {
    const { hostOrgId, email } = ctx.params;

    let isAdmin = ctx.isAuthorized(ctx.session.user, 'admin', hostOrgId);
    let isRoot = ctx.session.user.roles.includes('root');

    if (!isAdmin && !isRoot) ctx.throw(401);

    let user, org;

    try {
      user = await User.query().findOne({ email });
      if (!user) ctx.throw(404, 'cant find user');
    } catch (e) {
      ctx.error('deleteOrgUser', e);
      ctx.throw(500, 'error fetching user');
    }

    try {
      org = await Organization.query().findOne({ id: hostOrgId });
      if (!org) ctx.throw(404, 'cant find org');
    } catch (e) {
      ctx.error('deleteOrgUser', e);
      ctx.throw(500, 'error fetching org');
    }

    ctx.body = await org.$relatedQuery('users').unrelate().where({ 'users.id': user.id });
  }

  async function patchOrgUser(ctx, next) {
    const { hostOrgId, email } = ctx.params;
    const { orgRoles } = ctx.request.body;
    const userRoles = orgRoles[hostOrgId];

    let isAdmin = ctx.isAuthorized(ctx.session.user, 'admin', hostOrgId);
    let isRoot = ctx.session.user.roles.includes('root');

    if (!isAdmin && !isRoot) ctx.throw(401);

    let patchedUser;

    try {
      patchedUser = await User.query().findOne({ email });
      if (!patchedUser) ctx.throw(404, 'cant find user');
    } catch (e) {
      ctx.error('patchOrgUser', e);
      ctx.throw(500, 'error fetching user');
    }

    // const hostOrg = await user.$relatedQuery('organizations').where({ 'organizations.id': hostOrgId }).first()

    try {
      ctx.body = await patchedUser
        .$relatedQuery('organizations')
        .patch({ userRoles: { roles: userRoles } })
        .where({ 'organizations.id': hostOrgId });
    } catch (e) {
      ctx.error('patchOrgUser relate', e);
      ctx.throw(500, 'error relating user');
    }
  }

  async function getPatients(ctx, next) {
    const { hostOrgId, start, end } = ctx.request.query;

    let isDoctor = ctx.isAuthorized(ctx.session.user, 'doctor', hostOrgId);
    let isVerifier = ctx.isAuthorized(ctx.session.user, 'verifier', hostOrgId);
    let isAdmin = ctx.isAuthorized(ctx.session.user, 'admin', hostOrgId);
    let isRoot = ctx.session.user.roles.includes('root');

    if (!isDoctor && !isVerifier && !isAdmin && !isRoot) {
      ctx.throw(403);
    }

    const user = await User.query()
      .where({ id: ctx.session.user.id })
      .withGraphFetched('[organizations.[roles]]')
      .first();
    if (!user) {
      ctx.throw(405);
    }

    let hostOrg = await user.$relatedQuery('organizations').where({ 'organizations.id': hostOrgId }).first();
    if (isRoot) {
      hostOrg = await Organization.query().findOne({ id: hostOrgId });
    }

    try {
      const users = await hostOrg
        .$relatedQuery('users')
        .withGraphJoined('[organizations,roles]')
        .withGraphJoined('tests.[state]')
        .orderBy('createdAt');

      const patients = await Promise.all(
        users.map(async ({ id, createdAt, email, name, photo, tests, userRoles, roles, organizations }) => {
          const patient = {
            id,
            createdAt,
            email,
            name,
            photo,
            roles,
            userRoles
          };

          if (isAdmin || isRoot) {
            const orgRoles = {};
            organizations.forEach((org) => {
              let { roles } = org.userRoles;
              if (typeof roles === 'string') {
                roles = roles.split(',');
              }
              orgRoles[org.id] = roles;
            });
            patient.orgRoles = orgRoles;
          }

          if (isDoctor) {
            tests = tests.map((test) => {
              test.connectionId = test.testRef.split('.')[0];
              test.state = test.state.state;
              return test;
            });
            tests.sort((a, b) => {
              return moment(a.createdAt) < moment(b.createdAt);
            });
            patient.testCount = tests && tests.length;
            patient.tests = tests;
          }

          if (isVerifier) {
            let verifications = await Verification.query()
              .where({ holderId: id, orgId: hostOrg.id })
              .withGraphJoined('[organization, verifier, holder]');

            if (start && end) {
              const utcStart = DateTime.fromISO(start);
              const utcEnd = DateTime.fromISO(end);

              verifications = verifications.filter(({ updatedAt }) => {
                const verificationDate = DateTime.fromMillis(Date.parse(updatedAt));
                return verificationDate >= utcStart && verificationDate <= utcEnd;
              });
            }

            patient.verifications = verifications.map(mapVerificationDto);
            patient.totalVerifications = verifications && verifications.length;
          }

          return patient;
        })
      );

      ctx.body = patients;
    } catch (e) {
      ctx.error(`Error getting users for organization ${hostOrgId}.`, e);
    }
  }

  async function getVerifiedUsers(ctx, next) {
    const { hostOrgId, start, end } = ctx.request.query;
    let isVerifier = ctx.isAuthorized(ctx.session.user, 'verifier', hostOrgId);

    if (!isVerifier) {
      ctx.throw(403);
    }

    let org = await Organization.query().where({ 'organizations.id': hostOrgId }).first();
    if (!org) {
      ctx.throw(400);
    }

    try {
      const users = await org.$relatedQuery('users').orderBy('createdAt');

      let patients = await Promise.all(
        users.map(async ({ id, createdAt, email, phone, name, photo }) => {
          const patient = {
            id,
            createdAt,
            email,
            name,
            photo,
            phone
          };

          let verifications = await Verification.query()
            .where({ holderId: id, orgId: org.id })
            .withGraphJoined('[organization, verifier, holder]');

          if (start && end) {
            const utcStart = DateTime.fromISO(start);
            const utcEnd = DateTime.fromISO(end);

            verifications = verifications.filter(({ updatedAt }) => {
              const verified = DateTime.fromMillis(Date.parse(updatedAt));
             
              if (
                verified.day === utcStart.day &&
                verified.month === utcStart.month &&
                verified.year === utcStart.year
              ) {
                return true;
              }

              if (
                verified.day === utcEnd.day &&
                verified.month === utcEnd.month &&
                verified.year === utcEnd.year
              ) {
                return true;
              }

              return verified >= utcStart && verified <= utcEnd;
            });
          }
          
          patient.verifications = verifications.map(mapVerificationDto);
          patient.totalVerifications = verifications && verifications.length;

          return patient;
        })
      );

      if (start && end) {
        patients = patients.filter((patient) => patient.verifications && patient.verifications.length);
      }

      ctx.body = patients;
    } catch (e) {
      ctx.error(`Error getting users for organization ${hostOrgId}.`, e);
    }
  }

  async function getOrgs(ctx, next) {
    let orgs = [];
    const { id } = ctx.session.user;

    let isRoot = ctx.session.user.roles.includes('root');

    if (isRoot) {
      orgs = await Organization.query().withGraphFetched('[roles]').orderBy('id');
    } else {
      ctx.throw(500, 'DEPRECATED CASE. REMOVE CASE IF NOBODY COMPLAINS');

      const user = await User.query().findById(id);
      orgs = await user.$relatedQuery('organizations').withGraphFetched('[roles]').orderBy('id').distinct();
    }

    for (const org of orgs) {
      if (org.roles) {
        org.roles = org.roles.map((r) => r.name);
      }
    }
    ctx.body = orgs;
  }

  async function getOrg(ctx, next) {
    const { id } = ctx.session.user;

    let isRoot = ctx.session.user.roles.includes('root');

    if (!isRoot) {
      ctx.throw(403);
    }
    
    const org = await Organization.query()
      .where({
        id: ctx.params.id
      })
      .withGraphFetched('[roles]')
      .first();

    if (!org) {
      ctx.throw(404, 'org not found');
    }

    if (org.roles) {
      org.roles = org.roles.map((r) => r.name);
    }

    ctx.body = org;
  }

  async function postOrg(ctx, next) {
    const { name, roles, config } = ctx.request.body;

    let isRoot = ctx.session.user.roles.includes('root');

    if (!isRoot) {
      ctx.throw(403);
    }

    ctx.body = await Organization.transaction(async (trx) => {
      let org = {
        name,
        config
      };

      if (roles) {
        org.roles = await Promise.all(
          roles.map((name) =>
            Role.query()
              .where({
                name
              })
              .first()
          )
        );
      }

      org = await Organization.query(trx).insertGraphAndFetch(org, {
        relate: true
      });

      if (org.roles) {
        org.roles = org.roles.map((r) => r.name);
      }
      return org;
    });
  }

  async function putOrg(ctx, next) {
    const { id } = ctx.params;
    const { email, name, roles, parentOrgId, config } = ctx.request.body;

    let isRoot = ctx.session.user.roles.includes('root');

    if (!isRoot) {
      ctx.throw(403);
    }

    ctx.body = await Organization.transaction(async (trx) => {
      try {
        let org = await Organization.query(trx).findById(id);
        org.email = email;
        org.name = name;
        org.config = config;
        org.parentOrgId = parentOrgId;
        org.roles = [];
        if (roles) {
          org.roles = await Promise.all(
            roles.map((name) =>
              Role.query(trx)
                .where({
                  name
                })
                .first()
            )
          );
        }
        
        org = await Organization.query(trx).upsertGraphAndFetch(org, {
          relate: true,
          unrelate: true
        });
        
        if (org.roles) {
          org.roles = org.roles.map((r) => r.name);
        }

        return org;
      } catch (err) {
        ctx.error(err);
        ctx.throw(500, err);
      }
    });
  }

  async function deleteOrg(ctx, next) {
    const { id } = ctx.params;

    let isRoot = ctx.session.user.roles.includes('root');

    if (!isRoot) {
      ctx.throw(403);
    }
    
    await Organization.relatedQuery('roles').for(id).unrelate();
    await Organization.query().deleteById(id);
    ctx.status = 204;
  }

  async function provisionOrg(ctx, next) {
    let { id } = ctx.params;

    let isRoot = ctx.session.user.roles.includes('root');

    if (!isRoot) {
      ctx.throw(403);
    }

    ctx.log(`Provisioning organization ${id}.`);

    try {
      id = parseInt(id);
    } catch (err) {
      ctx.throw(400);
    }
    try {
      await ctx.$withers.withOrg(id, (org) => ctx.$streetcred.provision(org));
      ctx.status = 200;
    } catch (err) {
      ctx.error(`Error provision org ${id}.`, err);
      ctx.throw(500, err);
    }
  }

  async function getOrgWallet(ctx, next) {
    const { hostOrgId } = ctx.params;

    if (!hostOrgId) {
      ctx.throw(400);
    }

    const { id } = ctx.session.user;
    if (!id) {
      ctx.throw(401);
    }

    const user = await User.query().where({ id }).withGraphFetched('[wallets]').first();
    if (!user) {
      ctx.throw(401);
    }

    const [organization, connections, verificationRequests] = await Promise.all([
      await Organization.query().findById(hostOrgId),
      await OrgConnections.query()
        .where({ org_id: hostOrgId }),
      await Verification.query()
        .where({ org_id: hostOrgId })
        .whereNot({ holder_id: null })
        .orderBy('created_at', 'desc')
        .withGraphJoined('[organization, verifier, holder]')
    ]);

    ctx.body = {
      organization: mapOrganizationDto(organization),
      connections: connections.map(mapOrganizationConnectionDto),
      verificationRequests: verificationRequests.map(mapVerificationDto)
    };
  }

  logRoutes(router);

  return router;
};
