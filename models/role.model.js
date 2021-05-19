const { Model } = require('objection');

module.exports = class Role extends Model {
  static get tableName() {
    return 'roles';
  }

  static get idColumn() {
    return 'id';
  }
};
