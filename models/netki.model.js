const { Model } = require('objection');

module.exports = class Netki extends Model {
  static get tableName() {
    return 'netki';
  }

  static get idColumn() {
    return 'id';
  }
};
