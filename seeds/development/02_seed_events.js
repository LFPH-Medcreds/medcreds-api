const { Event, User } = require('../../models');

exports.seed = async (knex) => {
  // const users = await User.query().withGraphFetched('[roles, tests, meetings, organizations, callbacks]')
  return true;
  // for await (const user of users) {
  //     if (user.streetcred_user_id) {
  //         await Event.query().insert({ type: 'user connected', user })
  //     }

  //     if (user.meetings && user.meetings.length) {
  //         await Event.query().insert({ type: 'appointment scheduled', user })
  //     }

  //     if (user.credential && user.credential.credentialId) {
  //         await Event.query().insert({
  //             type: 'covid credential granted',
  //             user
  //         })
  //     }
  // }
};
