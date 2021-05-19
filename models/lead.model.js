const { Model } = require('objection');

module.exports = class Lead extends Model {
  static get tableName() {
    return 'leads';
  }

  static get idColumn() {
    return 'id';
  }
};
