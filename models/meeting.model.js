const { Model } = require('objection');

module.exports = class Meeting extends Model {
  static get tableName() {
    return 'meetings';
  }

  static get idColumn() {
    return 'id';
  }

  static get relationMappings() {
    // import models here to prevent require loops
    const { User } = require('.');

    return {
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: 'meetings.id',
          through: {
            from: 'users_meetings.meeting_id',
            to: 'users_meetings.user_id'
          },
          to: 'users.id'
        }
      }
    };
  }
};
