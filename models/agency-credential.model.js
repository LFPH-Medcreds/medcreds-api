const { Model } = require('objection');

module.exports = class AgencyCredential extends Model {
  static get tableName() {
    return 'agency_credentials';
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
          from: 'agency_credentials.user_id',
          to: 'users.id'
        }
      },
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: Organization,
        join: {
          from: 'agency_credentials.org_id',
          to: 'organizations.id'
        }
      }
    };
  }
};
