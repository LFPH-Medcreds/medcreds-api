const { Model } = require('objection');

module.exports = class Wallet extends Model {
  static get tableName() {
    return 'wallets';
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
          from: 'wallets.id',
          through: {
            from: 'users_wallets.wallet_id',
            to: 'users_wallets.user_id'
          },
          to: 'users.id'
        }
      }
    };
  }
};
