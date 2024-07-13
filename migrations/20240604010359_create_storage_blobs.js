/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = (knex) => knex.schema.createTable('storage_blobs', (table) => {
  table.increments('id').primary();
  table.timestamp('created_at', { precision: 6 }).notNullable();
  table.timestamp('updated_at', { precision: 6 }).notNullable();
  table.string('name').notNullable();
  table.string('mimetype').notNullable();
  table.integer('size').notNullable();
  table.string('extension').notNullable();
  table.string('path');

  table.unique(['path']);
});

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = (knex) => knex.schema.dropTable('storage_blobs');
