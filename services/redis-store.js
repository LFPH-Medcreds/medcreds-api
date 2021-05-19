module.exports = {
  async get(sid, ctx) {
    try {
      const forwardedIp = ctx.headers['x-forwarded-for'];
      let ip = ctx.ips.length > 0 ? ctx.ips[ctx.ips.length - 1] : ctx.ip;
      if (ip === '::ffff:127.0.0.1') ip = '::1'; // hack for nuxt
      ip = forwardedIp || ip;
      if (ip.includes(',')) ip = ip.split(',')[0];
      // console.info(sid, ctx.userAgent.source, ip)
      const advancedSID = `SESSION:${Buffer.from(sid + ctx.userAgent.source + ip).toString('base64')}`;
      const data = await this.redis.get(advancedSID);
      if (data) {
        const session = JSON.parse(data);
        if (session) session.ttl = await this.redis.ttl(advancedSID);
        return session;
      }
      console.warn(`session not found for ${advancedSID}`);
    } catch (e) {
      console.error('error getting session', e);
    }
  },

  async set(session, { sid = this.getID(24), maxAge = 1000000 } = {}, ctx) {
    try {
      const forwardedIp = ctx.headers['x-forwarded-for'];
      let ip = ctx.ips.length > 0 ? ctx.ips[ctx.ips.length - 1] : ctx.ip;
      if (ip === '::ffff:127.0.0.1') ip = '::1'; // hack for nuxt
      ip = forwardedIp || ip;
      if (ip.includes(',')) ip = ip.split(',')[0];
      const advancedSID = `SESSION:${Buffer.from(sid + ctx.userAgent.source + ip).toString('base64')}`;
      // Use redis set EX to automatically drop expired sessions
      // console.error('maxAge / 1000', maxAge / 1000)
      const aid = await this.redis.set(advancedSID, JSON.stringify(session), 'EX', maxAge / 1000);
      if (!aid) console.warn('missing session id: ', advancedSID);
    } catch (e) {
      console.error('error setting session', e);
    }
    return sid;
  },

  async destroy(sid, ctx) {
    try {
      const forwardedIp = ctx.headers['x-forwarded-for'];
      let ip = ctx.ips.length > 0 ? ctx.ips[ctx.ips.length - 1] : ctx.ip;
      if (ip === '::ffff:127.0.0.1') ip = '::1'; // hack for nuxt
      ip = forwardedIp || ip;
      if (ip.includes(',')) ip = ip.split(',')[0];
      const advancedSID = `SESSION:${Buffer.from(sid + ctx.userAgent.source + ip).toString('base64')}`;
      console.warn(`destroying session ${advancedSID}`);
      return this.redis.del(advancedSID);
    } catch (e) {
      console.error('error destroying session', e);
    }
  }
};
