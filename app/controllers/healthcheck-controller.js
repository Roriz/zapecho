export const healthcheck = {
  handler(_, reply) {
    reply.send({ status: 'ok' });
  },
};

export default {
  healthcheck,
};
