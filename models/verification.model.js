const { Model } = require('objection');

module.exports = class Verification extends Model {
  static get tableName() {
    return 'verifications';
  }

  static get idColumn() {
    return 'id';
  }

  static get relationMappings() {
    const { User, Organization } = require('.');

    return {
      verifier: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'verifications.verifier_id',
          to: 'users.id'
        }
      },
      holder: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'verifications.holder_id',
          to: 'users.id'
        }
      },
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: Organization,
        join: {
          from: 'verifications.org_id',
          to: 'organizations.id'
        }
      }
    };
  }
};
