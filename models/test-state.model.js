const { Model } = require('objection');

module.exports = class TestState extends Model {
  static get tableName() {
    return 'test_states';
  }

  static get idColumn() {
    return 'id';
  }
};
