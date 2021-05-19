const { Model } = require('objection');

module.exports = class WalletVerification extends Model {
  static get tableName() {
    return 'wallet_verifications';
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
          from: 'wallet_verifications.user_id',
          to: 'users.id'
        }
      },
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: Organization,
        join: {
          from: 'wallet_verifications.org_id',
          to: 'organizations.id'
        }
      }
    };
  }
};
