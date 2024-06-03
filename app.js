require('dotenv').config();

const Fastify = require('fastify');

const routes = require('./configs/routers.js');
const { db } = require('./configs/database.js');

const fastify = Fastify({
  logger: true,
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
