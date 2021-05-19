const { google } = require('googleapis');
const { GoogleAuth, JWT } = require('google-auth-library');

const keys = require('../gsuite-service-key.json');

const auth = new GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/admin.directory.user',
    'https://www.googleapis.com/auth/admin.directory.group'
  ],
  keyFilename: './gsuite-service-key.json'
});

const client = new JWT({
  email: keys.client_email,
  key: keys.private_key,
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/admin.directory.user',
    'https://www.googleapis.com/auth/admin.directory.group'
  ]
});

async function getFreeBusy({ timeMin, timeMax }) {
  const calendar = google.calendar({ version: 'v3', auth });
  const busyTimes = await calendar.freebusy.query({
    auth,
    resource: {
      items: [
        { id: 'dorin@proofmarket.io' }, // TODO: consider removing the entire route
      ],
      timeZone: 'PDT',
      timeMin,
      timeMax
    }
  });
  console.log(busyTimes);
  return busyTimes;
}

async function bookMeeting({ calendarId, event }) {
  client.subject = calendarId;

  const calendar = google.calendar({ version: 'v3', auth: client });
  try {
    const booking = await calendar.events.insert({
      auth: client,
      calendarId,
      resource: event,
      sendNotifications: true,
      sendUpdates: 'all'
    });
    return booking;
  } catch (e) {
    console.error('failed to book meeting', e);
  }
}

module.exports = {
  getFreeBusy,
  bookMeeting
};
