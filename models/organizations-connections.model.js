const { Model } = require('objection');

module.exports = class OrgConnections extends Model {
  static get tableName() {
    return 'organizations_connections';
  }

  static get idColumn() {
    return 'connection_id';
  }

  static get relationMappings() {
    const { Organization, User } = require('.');

    return {
      organization: {
        relation: Model.HasOneRelation,
        modelClass: Organization,
        join: {
          from: 'organizations_connections.org_id',
          to: 'organizations.id'
        }
      },
      user: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'organizations_connections.user_id',
          to: 'users.id'
        }
      }
    };
  }
};
