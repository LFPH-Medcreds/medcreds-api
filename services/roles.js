async function isAuthorized(user, role, hostOrgId) {
  const { orgRoles } = user;
  const roles = orgRoles[hostOrgId];
  if (!roles || !roles.length) return false;
  // ['doctor', 'verifier', 'admin']
  return roles.includes(role);
}

function hasRoleInOrg(hostOrgId, ...roles) {
  return (ctx, next) => {
    let { user } = ctx.session;
    if (!user) ctx.throw(401);

    const orgRoles = user.orgRoles[hostOrgId];
    if (!orgRoles || !orgRoles.length) return false;

    let result = false;

    for (const role of roles) {
      result = orgRoles.includes(role);
      if (result) return true;
    }
    if (!result) {
      ctx.throw(403);
    }
    return next();
  };
}

module.exports = {
  isAuthorized,
  hasRoleInOrg
};
