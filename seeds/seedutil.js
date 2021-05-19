const { TestState } = require('../models');

module.exports = {
  async testStates(knex) {
    TestState.knex(knex);
    const testStates = [
      'new',
      'observing',
      'authorizing',
      'completed',
      'rejected',
      'abandoned',
      'awaiting results',
      'credential issued'
    ];
    for await (const state of testStates) {
      let [{ count }] = await TestState.query().count().where({ state });
      count = parseInt(count);
      if (!count) {
        await TestState.query().insert({ state });
      }
    }
  }
};
