const fs = require('fs');
const jwt = require('jsonwebtoken');

// use 'utf8' to get string instead of byte array  (512 bit key)

const privateKEY = fs.readFileSync('jwt/server.key', 'utf8');
const publicKEY = fs.readFileSync('jwt/server.cert', 'utf8');

module.exports = {
  sign: (payload, options) => {
    const signatureOptions = jwtOptions(options);
    return jwt.sign(payload, privateKEY, signatureOptions);
  },
  verify: (token, options) => {
    const verifyOptions = jwtOptions(options);
    try {
      return jwt.verify(token, publicKEY, verifyOptions);
    } catch (err) {
      return false;
    }
  },
  jwtOptions: jwtOptions,
  // don't use this, it doesn't check signature
  decode: (token) => {
    return jwt.decode(token, { complete: true }); // null if invalid
  }
};

function jwtOptions(options) {
  options = options || {};
  let { issuer, subject, audience } = options;
  issuer = issuer || 'MedCreds';
  audience = 'client';
  subject = subject || 'MedCreds';
  const expiresIn = '30m';
  const algorithm = 'RS256';
  return { issuer, subject, audience, expiresIn, algorithm };
}
