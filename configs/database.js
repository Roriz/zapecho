const knex = require('knex');
const envParams = require('./env_params.js');

const configs = {
  client: 'pg',
  connection: `${process.env.DATABASE_URL}/${envParams().DATABASE_NAME}`,
  migrations: {
    directory: '../migrations',
  },
};

const db = () => knex(configs);

module.exports = configs;
module.exports.db = db;
