const { MAILGUN_API_KEY } = require('../config');

const domain = 'get.medcreds.com';
const mailgun = require('mailgun-js')({
  apiKey: MAILGUN_API_KEY,
  domain
});

module.exports = mailgun;
