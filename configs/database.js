const knex = require('knex');
const envParams = require('./env_params.js');

const configs = {
  client: 'pg',
  connection: `${envParams().database_url}/${envParams().database_name}`,
  migrations: {
    directory: '../migrations',
  },
  pool: {
    min: 2,
    max: 10,
  },
};
let knexInstance;

const db = () => {
  if (!knexInstance) {
    knexInstance = knex(configs);
  }

  return knexInstance
};

module.exports = configs;
module.exports.db = db;
