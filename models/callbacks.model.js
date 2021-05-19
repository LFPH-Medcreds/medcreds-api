const { Model } = require('objection');

module.exports = class Callback extends Model {
  static get tableName() {
    return 'streetcred_callbacks';
  }

  static get idColumn() {
    return 'id';
  }
};
