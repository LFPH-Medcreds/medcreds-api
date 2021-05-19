const { hasRole } = require('../util');
const router = require('koa-router')();

module.exports = ({ psql }) => {
  router.get('/metrics', getMetrics);

  async function getMetrics(ctx, next) {
    let { start, end, orgId } = ctx.query;
    const org = orgId ? { id: orgId } : null;
    start = start ? new Date(start) : null;
    end = end ? new Date(end) : null;

    const { user } = ctx.session;

    let isDoctor = ctx.isAuthorized(ctx.session.user, 'doctor', orgId);
    let isVerifier = ctx.isAuthorized(ctx.session.user, 'verifier', orgId);
    let isAdmin = ctx.isAuthorized(ctx.session.user, 'admin', orgId);
    let isRoot = ctx.session.user.roles.includes('root');

    if (!isDoctor && !isVerifier && !isAdmin && !isRoot) ctx.throw(403);

    ctx.body = await ctx.$metrics.fetch({ start, end, org });
  }

  return router;
};
