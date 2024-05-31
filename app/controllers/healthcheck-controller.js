export const healthcheck = {
  handler(req, reply) {
    reply.send({ status: 'ok' });
  },
};

export default {
  healthcheck,
};
