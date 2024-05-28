
export const index = {
  handler: function (_, reply) {
    reply.send({ status: 'ok' })
  }
}

export default {
  index
}
