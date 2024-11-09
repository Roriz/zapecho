/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('calendar_auths', (table) => {
    table.increments('id').primary();
    table.timestamps(true, true);
    
    table.integer('client_id').unsigned().notNullable();
    table.string('code').notNullable();
    table.jsonb('token').notNullable();
    table.string('provider').notNullable();
    table.string('primary_calendar_id');

    table.foreign('client_id').references('clients.id').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('calendar_auths');
};
