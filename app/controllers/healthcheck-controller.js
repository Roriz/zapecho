const healthcheck = {
  handler(req, reply) {
    reply.send({ status: 'ok' });
  },
};

module.exports = healthcheck;
