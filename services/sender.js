const {
  MOBILE_APP_INSTALLATION_LINK,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM,
  TWILIO_SID,
  MAILGUN_API_KEY
} = require('../config');

const { withOrg } = require('./withers');
const { createDynamicLink } = require('./firebase');

const moment = require('moment');

const capitalize = (str) => {
  if (!str) return;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const domain = 'get.medcreds.com';
const mailgun = require('mailgun-js')({
  apiKey: MAILGUN_API_KEY,
  domain
});
const twilio = require('twilio')(TWILIO_SID, TWILIO_AUTH_TOKEN);

module.exports = {
  mailgun,
  sendInvitationEmail: async ({ to, hostOrgId, inviteCode, roles, text, me }) => {
    // const tokenLink = `${process.env.PORTAL_ORIGIN}/register?secret=${inviteCode}`

    let tokenLink = `${process.env.PORTAL_ORIGIN}/register`;
    if (inviteCode) tokenLink += `?secret=${inviteCode}`;

    const dynamicLink = await createDynamicLink(tokenLink);

    const org = hostOrgId ? await withOrg(hostOrgId) : { name: 'MedCreds Network' };

    const email = {
      subject: `${me.name} invites you to ProofMarket on behalf of ${org.name}`,
      from: 'ProofMarket <invite@get.medcreds.com>',
      to,
      'v:tokenLink': dynamicLink,
      'v:orgName': org.name,
      'v:role': roles,
      template: 'invite',
      't:text': 'yes',
      'o:dkim': 'yes'
    };
    return mailgun.messages().send(email);
  },

  sendSSIEmail: async ({ to, hostOrgId, verifyCode, ssiLink, messageType }) => {
    let orgName = '';
    if (hostOrgId) {
      await withOrg(hostOrgId, (org) => {
        // const { appLink: orgAppLink } = org.config
        orgName = org.name;
      });
    }

    ssiLink = `${process.env.PORTAL_ORIGIN}/verify?id=${verifyCode}`;

    const email = {
      subject: 'You have a new ProofMarket Health Wallet request',
      from: 'ProofMarket <no-reply@medcreds.com>',
      to,
      'v:ssiLink': ssiLink,
      'v:orgName': orgName,
      't:text': 'yes',
      'o:dkim': 'yes',
      template: `${messageType}`
    };
    return mailgun.messages().send(email);
  },

  sendInvitationSms: async ({ body, to, hostOrgId, inviteCode, roles, me }) => {
    let from = TWILIO_FROM || '';
    let appLink = MOBILE_APP_INSTALLATION_LINK;

    const org = hostOrgId ? await withOrg(hostOrgId) : { name: 'MedCreds Network' };

    if (hostOrgId) {
      await withOrg(hostOrgId, (org) => {
        const { twilio, appLink: orgAppLink } = org.config;
        if (twilio) from = twilio.smsFrom;
        if (orgAppLink) {
          appLink = orgAppLink;
        }
      });
    }

    let tokenLink = `${process.env.PORTAL_ORIGIN}/register?secret=${inviteCode}`;

    const dynamicLink = await createDynamicLink(tokenLink);

    if (dynamicLink) {
      tokenLink = dynamicLink;
    }

    body = `\
${me.name} has invited you to join ProofMarket, on behalf of ${org.name}. Join now and start proving your health status.

Register here:
${tokenLink}
    `;
    return twilio.messages.create({
      from,
      to,
      body
    });
  },

  send2FactorCode: async ({ code, to }) => {
    const timestamp = moment().utc().format('ddd, MMM Do @ LT');
    return twilio.messages.create({
      from: TWILIO_FROM,
      to,
      body: `Your ProofMarket verification code is:\
\ 
${code}
\ 
${timestamp} UTC`
    });
  },

  sendSSISms: async ({ body, to, hostOrgId, ssiLink, messageType }) => {
    let from = TWILIO_FROM || '';
    let appLink = MOBILE_APP_INSTALLATION_LINK;
    let orgName = '';
    if (hostOrgId) {
      await withOrg(hostOrgId, (org) => {
        const { twilio, appLink: orgAppLink } = org.config;
        orgName = org.name;
        if (twilio) from = twilio.smsFrom;
        if (orgAppLink) {
          appLink = orgAppLink;
        }
      });
    }

    // const tokenLink = `${process.env.PORTAL_ORIGIN}/register?secret=${inviteCode}`
    body = `\
    Hello! ${body}
    You have a ${messageType} request from ${orgName}.

    View the request in your Health Wallet here ${ssiLink}
    `;
    return twilio.messages.create({
      from,
      to,
      body
    });
  },

  sendPasswordReset: async ({ to, userName, resetCode }) => {
    const tokenLink = `${process.env.PORTAL_ORIGIN}/changePassword?secret=${resetCode}`;
    const inlineStyle =
      'background-color:#1E88E5;border:none;border-radius:4px;color:white;padding:15px 32px;text-align:center;text-decoration:none;display:inline-block;font-size:16px;margin:4px 2px;cursor:pointer;';
    const email = {
      subject: 'ProofMarket password reset request',
      from: 'ProofMarket <reset@get.medcreds.com>',
      to,
      't:text': 'yes',
      'o:dkim': 'yes',
      text: `Reset your password: ${tokenLink}`,
      html: `<h3>Hi ${userName},</h3>
              Please follow this link to reset your password: ${tokenLink}
              <div style="padding:10px;">
                <a style="margin-left:40%;"ref="${tokenLink}">
                  <button style="${inlineStyle}">Reset Password</button>
                </a>
              </div>
          `
    };
    return mailgun.messages().send(email);
  },

  async notifyOfCredential({ user, organization }) {
    const email = {
      subject: `${user.name}, you have a new credential!`,
      from: 'ProofMarket <issuer@get.medcreds.com>',
      to: user.email,
      'v:link': `${process.env.PORTAL_ORIGIN}`,
      'v:issuer': organization.name,
      't:text': 'yes',
      'o:dkim': 'yes',
      template: 'offer-credential'
    };
    return mailgun.messages().send(email);
  },

  async sendVerificationConfirmation({ verifier, holder }) {
    const email = {
      subject: `${holder.name} has consented to your verification request!`,
      from: 'ProofMarket <verify@get.medcreds.com>',
      to: verifier.email,
      'v:link': `${process.env.PORTAL_ORIGIN}`,
      'v:holder': holder.name,
      't:text': 'yes',
      'o:dkim': 'yes',
      template: 'confirm-verification'
    };
    return mailgun.messages().send(email);
  },

  async sendProofRequest({ channel, to, verifyId, verifier, policyName }) {
    switch (channel) {
      case 'sms': {
        const from = TWILIO_FROM || '';

        let webLink = `${process.env.PORTAL_ORIGIN}/?id=${verifyId}`;

        const dynamicLink = await createDynamicLink(webLink);

        if (dynamicLink) {
          url = dynamicLink;
        }

        return twilio.messages.create({
          from,
          to,
          body: `\n${verifier.name} would like to verify your ${policyName}!\n\n${url}`
        });
      }
      case 'email': {
        const email = {
          subject: `${verifier.name} would like to verify your ${policyName}!`,
          from: 'ProofMarket <verify@get.medcreds.com>',
          to,
          't:text': 'yes',
          'o:dkim': 'yes',
          'v:verifyLink': `${process.env.PORTAL_ORIGIN}/?id=${verifyId}`,
          template: 'start-verification'
        };
        return mailgun.messages().send(email);
      }
    }
  },

  async sendOrgAdditionNotification({ inviterName, orgName, inviteeName, toEmail, toMobile }) {
    const loginUrl = `${process.env.PORTAL_ORIGIN}/login`;

    if (toMobile) {
      let from = TWILIO_FROM || '';

      body = `\
${inviterName} has added you to the ${orgName} on ProofMarket.

Login here:
${loginUrl}
    `;
      return twilio.messages.create({
        from,
        to: toMobile,
        body
      });
    } else if (toEmail) {
      const userAddEmail = {
        subject: `${inviterName} has added you to the ${orgName} on ProofMarket`,
        from: 'ProofMarket <notification@get.medcreds.com>',
        to: toEmail,
        'v:name': inviteeName,
        'v:message': `Please login to see which privileges you have for the ${orgName} organization.`,
        'v:orgName': orgName,
        'v:tokenLink': loginUrl,
        template: 'notify'
      };

      return mailgun.messages().send(userAddEmail);
    } else {
      throw Error('Expected one of toEmail or toMobile arguments to be present.');
    }
  }
};
