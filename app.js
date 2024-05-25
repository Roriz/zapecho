import 'dotenv/config'

import Fastify from 'fastify'
import fastifyPostgres from '@fastify/postgres'

import routes from './configs/routers.js'

const fastify = Fastify({
  logger: true
})

fastify.register(routes)
fastify.register(fastifyPostgres, {
  connectionString: `${process.env.DATABASE_URL}/${process.env.DATABASE_NAME}`
})

fastify.listen({
  port: process.env.PORT,
  host: '0.0.0.0'
}, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
