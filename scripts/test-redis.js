const { REDIS_HOST } = require('../config');
const Redis = require('ioredis');
const redis = new Redis({ host: REDIS_HOST });
const { randtoken } = require('../util');
//
(async () => {
  const token = randtoken(10);
  try {
    await redis.set(`CONNECTIONTEST:${token}`, 'foobar');
    await redis.del(`CONNECTIONTEST:${token}`);
    process.exit(0);
  } catch (err) {
    console.error('error', err);
    process.exit(-1);
  }
})();
