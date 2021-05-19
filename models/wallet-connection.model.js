const { Model } = require('objection');

module.exports = class WalletConnection extends Model {
  static get tableName() {
    return 'wallet_connections';
  }

  static get idColumn() {
    return 'id';
  }

  static get relationMappings() {
    const { User, Organization } = require('.');

    return {
      holder: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'wallet_connections.user_id',
          to: 'users.id'
        }
      },
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: Organization,
        join: {
          from: 'wallet_connections.org_id',
          to: 'organizations.id'
        }
      }
    };
  }
};
