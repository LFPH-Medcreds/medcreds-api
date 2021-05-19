import koaRouter = require('koa-router');
const router = new koaRouter();
import { ResponseBody } from '../utilities/response';
// import jwt from 'koa-jwt2';

/**
 * @api {GET} http://localhost:3006/v2/healthcheck
 * @apiGroup Info
 * @apiDescription Application Health Check
 * @apiUse CODE_200
 * @apiSuccessExample {json} Success Data Example
 {
    "status": "ko",
    "data": {
        "status": "ko"
    },
    total: 0,
    error: false
 }
 */
router.get('/', async (ctx, next) => {

  ctx.body = new ResponseBody(null, 'test123' );
});

// /**
//  * @api {GET} http://localhost:3006/v2/healthcheck/details
//  * @apiGroup Info
//  * @apiDescription Application Health Check Details
//  * @apiUse CODE_200
//  * @apiSuccessExample {json} Success Data Example
//  {
//     "status": "ko",
//     "data": {
//         "status": "ko"
//     },
//     total: 0,
//     error: false
//  }
//  */
// router.get('/auth/jwt/healthcheck', jwt({ secret: "shhhhhhared-secret" }), async (ctx, next) => {
//     ctx.body = resBody({
//         status: 'ko'
//     })
// })

module.exports = router;
