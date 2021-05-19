const { Model } = require('objection');

module.exports = class Ticket extends Model {
  static get tableName() {
    return 'tickets';
  }

  static get idColumn() {
    return 'ticket_id';
  }

  static get relationMappings() {
    // import models here to prevent require loops
    const User = require('./old_user.model');

    return {
      owner: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: `tickets.user_id`,
          to: `users.user_id`
        }
      }
    };
  }
};
