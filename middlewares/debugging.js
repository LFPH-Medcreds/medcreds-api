const crypto = require('crypto');
const chalk = require('chalk');
const { format } = require('path');

const genTraceId = () => {
  return crypto.randomBytes(16).toString('hex');
};

const validateTraceId = (s) => {
  return s ? /^[a-zA-Z0-9_.-]+$/.test(s) : false;
};

const makePrefix = (traceId, level) => {
  if (level < 3) {
    return `  ${chalk.gray('---')} ${chalk.bold(chalk.white(traceId))}`;
  } else if (level == 3) {
    return `  ${chalk.magenta('!!!')} ${chalk.bold(chalk.magenta(traceId))}`;
  } else {
    return `  ${chalk.red('xxx')} ${chalk.bold(chalk.red(traceId))}`;
  }
};

module.exports = async (ctx, next) => {
  ctx.traceId = validateTraceId(ctx.request.header['x-traceid'])
    ? ctx.request.header['x-traceid']
    : genTraceId();

  // attach logging functions
  ctx.debug = (...args) => {
    console.debug(makePrefix(ctx.traceId, 0), ...args);
  };
  ctx.log = (...args) => {
    console.log(makePrefix(ctx.traceId, 1), ...args);
  };
  ctx.info = (...args) => {
    console.info(makePrefix(ctx.traceId, 2), ...args);
  };
  ctx.warn = (...args) => {
    console.warn(makePrefix(ctx.traceId, 3), ...args);
  };
  ctx.error = (...args) => {
    console.error(makePrefix(ctx.traceId, 4), ...args);
  };

  // stopwatch
  ctx.monitor = async (name, func, ...args) => {
    const start = Date.now();
    let result;
    try {
      result = await func(...args);
    } catch (e) {
      ctx.error(`An error encountered while executing "${name}".`, e);
      throw e;
    }

    const duration = Date.now() - start;
    if (duration > 70000) {
      ctx.error(`Executed "${name}" in more than 7 seconds (${duration}ms).`);
    } else if (duration > 3000) {
      ctx.warn(`Executed "${name}" in more than 3 seconds (${duration}ms).`);
    } else {
      ctx.debug(`Executed "${name}" in ${duration}ms.`);
    }

    return result;
  };

  const start = Date.now();
  let error = null;
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;

    if (err.name === 'DBError') {
      ctx.body = 'Unknown error.';
    } else {
      ctx.body = err.message;
    }

    ctx.error('An unhandled error has occurred.', JSON.stringify(err.message));

    error = err;
  }
  const duration = Date.now() - start;

  if (ctx.method != 'OPTIONS') {
    let log = ctx.log;
    if (ctx.status >= 400 && ctx.status < 500) {
      log = ctx.warn;
    } else if (ctx.status >= 500) {
      log = ctx.error;
    }

    log(`${ctx.method} ${ctx.url} - ${ctx.status} ${duration}`);
  }

  ctx.set('X-TraceId', ctx.traceId);

  if (error) {
    ctx.app.emit('error', error, ctx);
  }
};
