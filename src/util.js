const { ENABLE_LOG_ROUTES } = require('../config');

function hasRole(it, role) {
  return it.roles && it.roles.indexOf(role) != -1;
}

function hasOrgRole(user, orgId, role) {
  const roles = user.orgRoles[orgId];
  return roles && roles.indexOf(role) != -1;
}

// Convert from normal to web-safe, strip trailing "="s
function webSafe64(base64) {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Convert from web-safe to normal, add trailing "="s
function normal64(base64) {
  return base64.replace(/-/g, '+').replace(/_/g, '/') + '=='.substring(0, (3 * base64.length) % 4);
}

function atob(a) {
  return Buffer.from(a, 'base64').toString();
}

function btoa(buf) {
  return Buffer.from(buf).toString('base64');
}

const crypto = require('crypto');
const _randtoken = require('rand-token').generator({
  source: crypto.randomBytes
});

function randtoken(length = 10) {
  return _randtoken.generate(length);
}

function rbac(...roles) {
  return (ctx, next) => {
    let { user } = ctx.session;
    if (!user) {
      ctx.throw(401);
    }
    let result = false;
    for (const role of roles) {
      if (user.roles.indexOf(role) != -1) {
        result = true;
        break;
      }
    }
    if (!result) {
      ctx.throw(403);
    }
    return next();
  };
}

function logRoutes(router) {
  if (ENABLE_LOG_ROUTES) {
    router.stack.forEach((route) => console.log(`${route.methods[0]} ${route.path}`));
  }
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

function times(ntimes, doIt) {
  const result = [];
  for (let idx = 0; idx < ntimes; idx++) {
    result.push(doIt(idx));
  }
  return result;
}

function toInt(ctx, expr, status) {
  try {
    return parseInt(expr);
  } catch (ex) {
    ctx.throw(status);
  }
}

module.exports = {
  atob,
  btoa,
  hasRole,
  hasOrgRole,
  logRoutes,
  webSafe64,
  normal64,
  randtoken,
  rbac,
  returnIt: (it) => {
    return it;
  },
  sleep,
  times,
  toInt
};

if (!Object.prototype.hasOwnProperty.call(global, '__stack')) {
  Object.defineProperty(global, '__stack', {
    get: function () {
      let orig = Error.prepareStackTrace;
      Error.prepareStackTrace = function (_, stack) {
        return stack;
      };
      let err = new Error();
      /* eslint-disable no-caller */
      Error.captureStackTrace(err, arguments.callee);
      /* eslint-enable no-caller */
      let stack = err.stack;
      Error.prepareStackTrace = orig;
      return stack;
    }
  });
}

if (!Object.prototype.hasOwnProperty.call(global, '__line')) {
  Object.defineProperty(global, '__line', {
    get: function () {
      return __stack[1].getLineNumber();
    }
  });
}

if (!Object.prototype.hasOwnProperty.call(global, '__file')) {
  Object.defineProperty(global, '__file', {
    get: function () {
      return __stack[1].getFileName();
    }
  });
}
