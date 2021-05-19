import * as bunyan from "bunyan";
const {LOGGING_TRACE_KEY, LoggingBunyan} = require('@google-cloud/logging-bunyan');
const loggingBunyan = new LoggingBunyan();

class Logger {
  public logger = bunyan.createLogger({
    name: process.env.K_SERVICE ? process.env.K_SERVICE : 'medcred-api',
    level: 'debug',
    serializers: bunyan.stdSerializers,
    streams: [
      process.env.K_SERVICE ? loggingBunyan.stream('info') : {stream: process.stdout, level: 'info'},,
    ],
  });
}

class LogAdapter {
  private static instance: Logger;
  constructor() {
    throw new Error('Use LogAdapter.getInstance()');
  }
  
  static getInstance(trace: string){
    if( !LogAdapter.instance ){
      LogAdapter.instance = new Logger();
    }
    return LogAdapter.instance.logger.child({ [LOGGING_TRACE_KEY]: trace }, true );
  }
}

module.exports = LogAdapter;
