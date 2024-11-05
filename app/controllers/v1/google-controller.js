const { linkToAuth, handleCallback } = require('~/repositories/google_calendar_repository.js');

const authenticate = {
  async handler(_req, reply) {
    const url = await linkToAuth();
    return reply.redirect(url);
  },
};

const callback = {
  async handler(request, reply) {
    const { code } = request.query;
    const tokens = await handleCallback(code);
    
    // TODO: Save tokens in database

    return reply.code(200).send({ tokens });
  }
};

module.exports = { authenticate, callback };
