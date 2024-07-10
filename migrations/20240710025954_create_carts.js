/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('carts', function(table) {
    table.increments('id').primary();
    table.timestamp('created_at', { precision: 6 }).notNullable();
    table.timestamp('updated_at', { precision: 6 }).notNullable();

    table.integer('user_id').unsigned().notNullable();
    table.integer('client_id').unsigned().notNullable();
    table.integer('product_id').unsigned().notNullable();
    table.integer('quantity').notNullable();
    table.integer('price').notNullable();
    table.integer('total_price').notNullable();


    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.foreign('client_id').references('clients.id').onDelete('CASCADE');
    table.foreign('product_id').references('products.id').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('carts');
};
