const LogAdapter = require('./logger');
const logger = LogAdapter.getInstance('response-middleware');

export interface ResponseBody {
  status: 'err' | 'ko';
  msg?: string; // job faild - reason //
  data?: any; //controller data
  total?: number;
}

export class ResponseBody implements ResponseBody {
  public status: 'err' | 'ko';

  constructor(
    error: Error | null | undefined,
    public msg?: string,
    public data?: any,
    public total?: number
  ) {
    this.status = error ? 'err' : 'ko';
  }
}

export const resError = (url: string, msg: any): ResponseBody => {
  // remove pii
  logger.error( msg, url);
  return new ResponseBody(null, msg.message, true, 0);
};

export const resInfo = (url: string, msg: any): ResponseBody => {
  // remove pii
  logger.info( msg );
  return new ResponseBody(null, msg, false, 0);
};
