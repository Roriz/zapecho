import "dotenv/config";

import Fastify from "fastify";

import routes from "./configs/routers.js";
import database from "./configs/database.js";

const fastify = Fastify({
  logger: true,
});

fastify.register(routes);

fastify.listen(
  {
    port: process.env.PORT,
    host: "0.0.0.0",
  },
  (err, address) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    fastify.log.info(`server listening on ${address}`);
    database();
    fastify.log.info(`database connected`);
  },
);
