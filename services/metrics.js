const { Event, Organization, User } = require('../models');
require('util');

module.exports = (psql) => {
  Event.knex(psql);
  Organization.knex(psql);
  User.knex(psql);

  return {
    async log(type, { user, org, payload, fileName, lineNumber, functionName }) {

      const userId = Number.isFinite(user) ? user : user?.id;
      const organizationId = Number.isFinite(org) ? org : org?.id;

      try {
        const event = {
          type,
          user_id: userId,
          org_id: organizationId,
          payload,
          fileName,
          functionName,
          lineNumber
        };
        await Event.query().insert(event);
      } catch (err) {
        console.error(`error logging event ${type}`, err);
      }
    },
    async fetch({ start, end, org } = {}) {
      if (!start) {
        // Default to previous 30 days
        start = new Date(Date.now() - 30 * 60 * 60 * 24 * 1000);
      }

      if (!end) {
        // Default to now
        end = new Date();
      }

      let query = Event.query()
        .select('type')
        .count()
        .where('created_at', '>=', start.toISOString())
        .andWhere('created_at', '<', end.toISOString())
        .whereNull('user_id');
      if (org && org.id) {
        query = query.andWhere({ org_id: org.id });
      }

      let rows = await query.groupBy('type');
      const globals = {};
      for (const row of rows) {
        globals[row.type] = Number(row.count);
      }

      query = Event.query()
        .alias('e')
        .select('type')
        .countDistinct('user_id')
        .where('e.created_at', '>=', start.toISOString())
        .where('e.created_at', '<', end.toISOString())
        .whereNotNull('user_id');
      if (org && org.id) {
        query = query.whereExists(
          Organization.relatedQuery('users').for(org.id).whereColumn('users.id', 'e.user_id')
        );
      }
      rows = await query.groupBy('type');

      const users = {};
      for (const row of rows) {
        users[row.type] = Number(row.count);
      }

      return {
        totalInvitations: globals['user invited'] || 0,
        totalRegistrations: users['user registered'] || 0,
        totalUsersWithAtLeastOneConnectionOffered: users['connection qr created'] || 0,
        totalUsersWithAtLeastOneConnectionAccepted: users['user connected'] || 0,
        totalUsersWithAtLeastOneConnectionDeclined: users['connection declined'] || 0,
        totalUsersWithAtLeastOneCredentialIssued: users['credential issued'] || 0,
        totalUsersWithAtLeastOneCredentialAccepted: users['credential accepted'] || 0,
        totalUsersWithAtLeastOneCredentialDeclined: users['credential declined'] || 0,
        totalUsersWithAtLeastOneVerificationRequested: users['verification requested'] || 0,
        totalUsersWithAtLeastOneVerificationApproved: users['verification approved'] || 0,
        totalUsersWithAtLeastOneVerificationDeclined: users['verification declined'] || 0
      };
    }
  };
};
