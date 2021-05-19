const { Model } = require('objection');

module.exports = class Organization extends Model {
  get hasStreetcred() {
    return this.config && this.config.streetcred && this.config.streetcred.apiKey;
  }

  hasRole(role) {
    return this.roles && (this.roles.indexOf(role) !== -1 || this.roles.find((r) => r.name === role));
  }

  static get tableName() {
    return 'organizations';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonAttributes() {
    return ['config'];
  }

  static get relationMappings() {
    // import models here to prevent require loops
    const { User, Role, Event, Test } = require('.');

    return {
      parent: {
        relation: Model.HasOneRelation,
        modelClass: Organization,
        join: {
          from: 'organizations.parent_org_id',
          to: 'organizations.id'
        }
      },
      roles: {
        relation: Model.ManyToManyRelation,
        modelClass: Role,
        join: {
          from: 'organizations.id',
          through: {
            from: 'organizations_roles.organization_id',
            to: 'organizations_roles.role_id'
          },
          to: 'roles.id'
        }
      },
      tests: {
        relation: Model.ManyToManyRelation,
        modelClass: Test,
        join: {
          from: 'organizations.id',
          through: {
            from: 'organizations_tests.organization_id',
            to: 'organizations_tests.test_id'
          },
          to: 'tests.id'
        }
      },
      events: {
        relation: Model.HasManyRelation,
        modelClass: Event,
        join: {
          from: 'organizations.id',
          to: 'events.org_id'
        }
      },
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: 'organizations.id',
          through: {
            from: 'organizations_users.organization_id',
            to: 'organizations_users.user_id',
            extra: {
              userRoles: 'roles'
            }
          },
          to: 'users.id'
        }
      }
    };
  }
};
