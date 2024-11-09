require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });
require('./lib/relative_absolute.js');

const Fastify = require('fastify');
const fastifySession = require('@fastify/session');
const fastifyCookie = require('@fastify/cookie');

const routes = require('./configs/routers.js');
const { db } = require('./configs/database.js');
const envParams = require('./configs/env_params.js');

const fastify = Fastify({ logger: true });
fastify.register(fastifyCookie);
fastify.register(fastifySession, { 
  cookieName: 'sessionId',
  secret: envParams().jwt_secret,
  cookie: { secure: false },
});

fastify.register(routes);

fastify.listen(
  {
    port: process.env.PORT,
    host: '0.0.0.0',
  },
  (err) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    db();
    fastify.log.info('database connected');
  },
);
