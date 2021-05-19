const processStartTime = Date.now();

if ( process.env.K_SERVICE ){
  require('@google-cloud/profiler').start({
    serviceContext: {
      service: process.env.K_SERVICE,
      version: '1.0.0',
    },
  });
}

import { createApp } from './app';
const port = process.env.PORT || 5000;

const LogAdapter = require('./utilities/logger');
const logger = LogAdapter.getInstance("server");
logger.info(`Starting server.. hang tight!`);
const app = createApp();

app.listen(port, () => {
  logger.info({
    startupDurationMs: Date.now() - processStartTime,
    port: port,
  }, `Server started!! http://localhost:${port}`);
});
