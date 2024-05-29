export const index = {
  handler(_, reply) {
    reply.send({ status: 'ok' });
  },
};

export default {
  index,
};
