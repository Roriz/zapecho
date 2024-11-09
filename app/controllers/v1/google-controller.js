const { linkToAuth, handleCallback } = require('~/repositories/google_calendar_repository.js');
const { generateToken, verifyToken } = require('~/services/auth/jwt.js');
const Clients = require('~/models/client.js');
const CalendarAuthsQuery = require('~/models/calendar_auth.js');

const authenticate = {
  async handler(req, reply) {
    if (!req.query.client_id) {
      return reply.code(400).send({ error: 'client_id is required' });
    }

    const client = await Clients().findOne('id', req.query.client_id);
    // TODO: validate if client can have more integrations

    const token = await generateToken({ client_id: client.id }, '1h');

    req.session.token = token;

    return reply.redirect(await linkToAuth());
  },
};

const callback = {
  async handler(req, reply) {
    if (!req.session.token) {
      return reply.code(401).send({ error: 'Unauthorized access' });
    }

    const token = await verifyToken(req.session.token);
    const clientId = token.payload.client_id;
    const googleCalendarToken = await handleCallback(req.query.code);
    const calendarAuth = await CalendarAuthsQuery().findOne('client_id', clientId);
    if (calendarAuth) {
      await CalendarAuthsQuery().updateOne(
        calendarAuth, {
          code: req.query.code,
          token: googleCalendarToken
        }
      );
    } else {
      await CalendarAuthsQuery().insert({
        client_id: clientId,
        code: req.query.code,
        token: googleCalendarToken
      });
    }

    return reply.code(200);
  }
};

module.exports = { authenticate, callback };
