const { Model } = require('objection');

module.exports = class AgencyVerification extends Model {
  static get tableName() {
    return 'agency_verifications';
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
          from: 'agency_verifications.user_id',
          to: 'users.id'
        }
      },
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: Organization,
        join: {
          from: 'agency_verifications.org_id',
          to: 'organizations.id'
        }
      }
    };
  }
};
