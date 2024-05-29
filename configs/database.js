import knex from 'knex';
import envParams from './env_params.js';

export default () => knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    database: envParams().DATABASE_NAME,
  },
  migrations: {
    tableName: 'knex_migrations',
  },
});
