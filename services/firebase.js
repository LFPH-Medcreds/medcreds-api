const axios = require('axios');

async function createDynamicLink(webLink) {
  const uriPrefix = 'https://join.medcreds.com';
  const androidPackageName = 'com.medcreds.mobile';
  const iosBundleId = 'com.medcreds.mobile';
  const appStoreId = '1518351834';
  const title = 'Connect with Doctor.';
  const description = 'Click this link to connect to your doctor.';
  const imageUrl = 'https://medcreds.com/logo-locked.png';

  const dynamicLinkInfo = {
    domainUriPrefix: uriPrefix,
    link: webLink,
    androidInfo: {
      androidPackageName: androidPackageName,

      // The link to open when the app isn't installed. Specify this to do something other than install your app from the Play Store
      //  when the app isn't installed, such as open the mobile web version
      androidFallbackLink: webLink
    },
    iosInfo: {
      iosBundleId: iosBundleId,
      iosIpadBundleId: iosBundleId,
      iosFallbackLink: webLink,
      iosIpadFallbackLink: webLink,

      iosAppStoreId: appStoreId
    },
    desktopInfo: {
      desktopFallbackLink: webLink
    },

    socialMetaTagInfo: {
      socialTitle: title,
      socialDescription: description,
      socialImageLink: imageUrl
    }
  };

  const suffix = {
    option: 'UNGUESSABLE'
  };

  const apiKey = 'FIREBASE SECRET KEY'; //TODO: pass the API key from the environment!
  const headers = { 'Content-Type': 'application/json' };
  const firebaseUrl = `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${apiKey}`;

  let dynamicLink = webLink;
  try {
    const { data: returnedLink } = await axios.post(firebaseUrl, { dynamicLinkInfo, suffix }, { headers });
    dynamicLink = returnedLink && returnedLink.shortLink;
  } catch (e) {
    console.log('Dynamic Links Error: ', e);
  }
  return dynamicLink;
}

module.exports = {
  createDynamicLink
};
