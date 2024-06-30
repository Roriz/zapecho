/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('client_products', (table) => {
    table.increments('id').primary();
    table.timestamps(true, true);

    table.integer('client_id').unsigned().notNullable();
    table.string('code').notNullable();
    table.string('name').notNullable();
    table.string('description');
    table.integer('price').notNullable();
    table.jsonb('metadata').defaultTo('{}').notNullable();
    
    table.foreign('client_id').references('clients.id').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('client_products');
};
