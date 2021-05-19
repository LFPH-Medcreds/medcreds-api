const { Model } = require('objection');

module.exports = class User extends Model {
  static get tableName() {
    return 'users';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonAttributes() {
    return ['connection'];
  }

  hasRole(role) {
    return this.roles && (this.roles.indexOf(role) != -1 || this.roles.find((r) => r.name == role));
  }

  static get relationMappings() {
    // import models here to prevent require loops
    const {
      Test,
      Organization,
      Meeting,
      Event,
      Role,
      Callback,
      Wallet,
      Verification,
      OrgConnections
    } = require('.');

    return {
      friends: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: 'users.id',
          through: {
            from: 'users_friends.user_id',
            to: 'users_friends.friend_id'
          },
          to: 'users.id'
        }
      },
      contacts: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: 'users.id',
          through: {
            from: 'users_friends.friend_id',
            to: 'users_friends.user_id'
          },
          to: 'users.id'
        }
      },
      wallets: {
        relation: Model.ManyToManyRelation,
        modelClass: Wallet,
        join: {
          from: 'users.id',
          through: {
            from: 'users_wallets.user_id',
            to: 'users_wallets.wallet_id'
          },
          to: 'wallets.id'
        }
      },
      requests: {
        relation: Model.HasManyRelation,
        modelClass: Verification,
        join: {
          from: 'users.id',
          to: 'verifications.verifier_id'
        }
      },
      verifications: {
        relation: Model.HasManyRelation,
        modelClass: Verification,
        join: {
          from: 'users.id',
          to: 'verifications.holder_id'
        }
      },
      events: {
        relation: Model.HasManyRelation,
        modelClass: Event,
        join: {
          from: 'users.id',
          to: 'events.user_id'
        }
      },
      roles: {
        relation: Model.ManyToManyRelation,
        modelClass: Role,
        join: {
          from: 'users.id',
          through: {
            from: 'users_roles.user_id',
            to: 'users_roles.role_id'
          },
          to: 'roles.id'
        }
      },
      callbacks: {
        relation: Model.HasManyRelation,
        modelClass: Callback,
        join: {
          from: 'users.streetcred_user_id',
          to: 'streetcred_callbacks.correlation'
        }
      },
      meetings: {
        relation: Model.ManyToManyRelation,
        modelClass: Meeting,
        join: {
          from: 'users.id',
          through: {
            from: 'users_meetings.user_id',
            to: 'users_meetings.meeting_id'
          },
          to: 'meetings.id'
        }
      },
      organizations: {
        relation: Model.ManyToManyRelation,
        modelClass: Organization,
        join: {
          from: 'users.id',
          through: {
            from: 'organizations_users.user_id',
            to: 'organizations_users.organization_id',
            extra: {
              userRoles: 'roles'
            }
          },
          to: 'organizations.id'
        }
      },
      orgConnections: {
        relation: Model.HasManyRelation,
        modelClass: OrgConnections,
        join: {
          from: 'org_connections.user_id',
          to: 'users.id'
        }
      },
      tests: {
        relation: Model.HasManyRelation,
        modelClass: Test,
        join: {
          from: 'users.id',
          to: 'tests.patient_id'
        }
      }
    };
  }
};
