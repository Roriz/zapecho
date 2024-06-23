const knex = require('knex');
const envParams = require('./env_params.js');

const configs = {
  client: 'pg',
  connection: `${envParams().database_url}/${envParams().database_name}`,
  migrations: {
    directory: '../migrations',
  },
};

const db = () => knex(configs);

module.exports = configs;
module.exports.db = db;
