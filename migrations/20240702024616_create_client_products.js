/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('products', function(table) {
    table.increments('id').primary();
    table.timestamp('created_at', { precision: 6 }).notNullable();
    table.timestamp('updated_at', { precision: 6 }).notNullable();

    table.integer('client_id').unsigned().notNullable();
    table.string('name').notNullable();
    table.string('code').notNullable();
    table.string('description').notNullable();
    table.string('visual_description');
    table.integer('price').notNullable();

    table.unique(['code', 'client_id']);
    table.foreign('client_id').references('clients.id').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('products');
};
