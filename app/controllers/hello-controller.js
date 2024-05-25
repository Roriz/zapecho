export const index = {
  handler: function (_, reply) {

    this.pg.connect((err, client, release) => {
      if (err) throw err
      console.log('Connected to database')
      release()
    })

    reply.send({ hello: 'world' })
  }
}

export default {
  index
}
