const { Model } = require('objection');

module.exports = class Test extends Model {
  static get tableName() {
    return 'tests';
  }

  static get idColumn() {
    return 'id';
  }

  static get relationMappings() {
    // import models here to prevent require loops
    const { Event, TestState, User, Organization } = require('.');

    return {
      patient: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'tests.patient_id',
          to: 'users.id'
        }
      },
      organizations: {
        relation: Model.ManyToManyRelation,
        modelClass: Organization,
        join: {
          from: 'tests.id',
          through: {
            from: 'organizations_tests.test_id',
            to: 'organizations_tests.organization_id'
          },
          to: 'organizations.id'
        }
      },
      state: {
        relation: Model.HasOneRelation,
        modelClass: TestState,
        join: {
          from: 'tests.test_state_id',
          to: 'test_states.id'
        }
      },
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: 'tests.id',
          through: {
            from: 'tests_users.test_id',
            to: 'tests_users.user_id'
          },
          to: 'users.id'
        }
      },
      events: {
        relation: Model.ManyToManyRelation,
        modelClass: Event,
        join: {
          from: 'tests.id',
          through: {
            from: 'tests_events.test_id',
            to: 'tests_events.event_id'
          },
          to: 'events.id'
        }
      }
    };
  }
};
