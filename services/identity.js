const { User, Organization, AgencyConnection, WalletConnection, OrgConnections } = require('../models');

const distinctBy = (data, key) => [...new Map(data.map((x) => [key(x), x]).values())].map((item) => item[1]);

const getUserWithDetails = async (id) => {
  const user = await User.query()
    .findOne({ id })
    .withGraphFetched('[roles, tests, meetings, wallets, organizations.[roles], friends, contacts]');

  if (!user) {
    return null;
  }

  let friends = [...user.friends, ...user.contacts];
  friends = distinctBy(
    friends.map(({ name, email, phone, photo }) => {
      return {
        name,
        email,
        phone,
        photo
      };
    }),
    (friend) => friend.email
  );

  user.friends = friends;
  delete user.contacts;

  /* Map the roles. */
  const roles = user.roles.map((role) => role.name);
  user.roles = roles;
  const isRoot = user && user.roles && user.roles.includes('root');
  if (isRoot) {
    user.organizations = await Organization.query().withGraphFetched('[roles]');

    user.organizations = user.organizations.map((org) => {
      org.userRoles = { roles: ['admin', 'doctor', 'verifier'] };
      return org;
    });
  }

  /* Cleanup organizations (map to dto) */
  user.organizations = user.organizations.map((org) => {
    const orgRoles = !org.roles
      ? []
      : org.roles.map((r) => r.name).filter((r) => r === 'doctor' || r === 'verifier');

    // God know what the hell this code is for... I don't think this is needed to be honest, but by default no roles results in an empty string...
    let userRolesForOrg =
      typeof org.userRoles.roles === 'string'
        ? (org.userRoles.roles = org.userRoles.roles.split(','))
        : org.userRoles.roles;

    // exclude user's roles that are not allowed in this org
    userRolesForOrg = userRolesForOrg.filter((r) => r === 'admin' || orgRoles.includes(r));

    const result = {
      id: org.id,
      name: org.name,
      email: org.email,
      logo: org.logo,
      parentOrgId: org.parentOrgId,
      roles: orgRoles,
      userRoles: userRolesForOrg
    };

    if (isRoot) {
      result.config = org.config;
    }

    return result;
  });

  if (!isRoot) {
    const rootOrg = user.organizations.find((org) => org.name === 'MedCreds Network');
    if (rootOrg) {
      user.rootOrg = rootOrg;
      user.organizations = user.organizations.filter((org) => org !== rootOrg);
    }
  }

  // Build the output DTO
  const userOrgRoles = {};
  user.organizations.forEach((org) => {
    userOrgRoles[org.id] = org.userRoles;
  });

  return {
    email: user.email,
    name: user.name,
    phone: user.phone,
    photo: user.photo,
    friends: user.friends,
    organizations: user.organizations,
    rootOrg: user.rootOrg,
    roles: user.roles,
    orgRoles: userOrgRoles,
    walletId: user.wallets && user.wallets.length && user.wallets[user.wallets.length - 1].walletId
  };
};

async function ensureConnected(userId, walletId, orgId, ctx) {
  const [user, walletConn, orgConn] = await Promise.all([
    User.query().where({ id: userId }).withGraphFetched('wallets').first(),
    WalletConnection.query().where({ user_id: userId, org_id: orgId }).first(),
    OrgConnections.query().where({ user_id: userId, org_id: orgId }).first()
  ]);

  if (!user) {
    throw 'Invalid user ID provided.';
  }

  if (walletConn && orgConn) {
    return {
      connectionId: walletConn.connectionId,
      orgConnectionId: orgConn.connectionId
    };
  }

  try {
    // create and accept invite
    const { data: connection } = await ctx.trinsic.withOrg(orgId, ({ client }) =>
      client.post('/connections', {})
    );

    const { invitation, connectionId } = connection;

    const acceptedConnection = await ctx.trinsic.withRootOrg(({ custody }) =>
      custody.acceptInvitation(walletId, invitation)
    );

    // save all to DB
    AgencyConnection.transaction(() =>
      Promise.all([
        AgencyConnection.query().insert({
          connection_id: connectionId,
          user_id: user.id,
          org_id: orgId,
          config: connection
        }),

        WalletConnection.query().insert({
          connection_id: acceptedConnection.connectionId,
          user_id: user.id,
          org_id: orgId,
          config: acceptedConnection
        }),

        OrgConnections.query().insert({
          connection_id: connectionId,
          name: user.name,
          org_id: orgId,
          state: 'Connected',
          user_id: user.id
        })
      ])
    );

    await ctx.$metrics.log('user connected', {
      fileName: __file,
      lineNumber: __line,
      user: user,
      org: { id: orgId }
    });

    return {
      connectionId: acceptedConnection.connectionId,
      orgConnectionId: connectionId
    };
  } catch (e) {
    ctx.error(`Failed to connect user ${user.email} to organization ${orgId}!`, e);

    throw e;
  }
}

const ensureFriends = async (user, other) => {
  try {
    const alreadyConnected = (
      (await User.relatedQuery('friends')
        .for([user.id, other.id])
        .where({ user_id: user.id, friend_id: other.id })
        .orWhere({ user_id: other.id, friend_id: user.id })
        .first()) !== undefined
    );
    
    if (!alreadyConnected) {
      await user.$relatedQuery('friends').relate(other);
    }
  } catch (e) {
    ctx.error('Error creating friendship between users.', e);
  }
};

module.exports = (psql) => {
  User.knex(psql);
  Organization.knex(psql);
  AgencyConnection.knex(psql);
  WalletConnection.knex(psql);
  OrgConnections.knex(psql);

  return {
    getUserWithDetails,
    ensureConnected,
    ensureFriends
  };
};
