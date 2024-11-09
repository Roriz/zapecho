const { GoogleCalendarRepository } = require('~/repositories/google_calendar_repository.js');
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

    return reply.redirect(await GoogleCalendarRepository.linkToAuth());
  },
};

const callback = {
  async handler(req, reply) {
    if (!req.session.token) {
      return reply.code(401).send({ error: 'Unauthorized access' });
    }

    const token = await verifyToken(req.session.token);
    const clientId = token.payload.client_id;
    const googleCalendarToken = await GoogleCalendarRepository.codeToToken(req.query.code);

    let calendarAuth = await CalendarAuthsQuery().findOne('client_id', clientId);
    if (calendarAuth) {
      calendarAuth = await CalendarAuthsQuery().updateOne(
        calendarAuth, {
          provider: 'google',
          code: req.query.code,
          token: googleCalendarToken
        }
      );
    } else {
      calendarAuth = await CalendarAuthsQuery().insert({
        client_id: clientId,
        provider: 'google',
        code: req.query.code,
        token: googleCalendarToken
      });
    }
    
    const primaryCalendarId = await GoogleCalendarRepository.getPrimaryCalendarId(clientId);
    await CalendarAuthsQuery().updateOne(
      calendarAuth, { primary_calendar_id: primaryCalendarId }
    );

    return reply.code(200).send({ message: 'Google Calendar authenticated' });
  }
};

module.exports = { authenticate, callback };
