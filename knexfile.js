const { DATABASE_URL, PG_OPTIONS, DEBUG_SQL } = require('./config');

module.exports = {
  development: {
    client: 'pg',
    debug: DEBUG_SQL,
    connection: `${DATABASE_URL}${PG_OPTIONS}`,
    seeds: {
      directory: './seeds/development'
    }
  },
  staging: {
    client: 'pg',
    debug: false,
    connection: `${DATABASE_URL}${PG_OPTIONS}`,
    seeds: {
      directory: './seeds/staging'
    }
  },
  production: {
    client: 'pg',
    debug: false,
    connection: `${DATABASE_URL}${PG_OPTIONS}`,
    seeds: {
      directory: './seeds/production'
    }
  },
  test: {
    client: 'pg',
    debug: false,
    connection: `${DATABASE_URL}${PG_OPTIONS}`,
    seeds: {
      directory: './seeds'
    }
  }
};
