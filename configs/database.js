import knex from 'knex';
import envParams from './env_params.js';

const configs = {
  client: 'pg',
  connection: `${process.env.DATABASE_URL}/${envParams().DATABASE_NAME}`,
  migrations: {
    directory: '../migrations',
  },
  disableMigrationsListValidation: true,
  disableTransactions: true,
  pool: {
    min: 2,
    max: 10,
  },
};

export const db = () => knex(configs);

export default configs;
