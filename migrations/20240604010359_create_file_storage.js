/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = (knex) => knex.schema.createTable('file_storages', (table) => {
  table.increments('id').primary();
  table.timestamp('created_at', { precision: 6 }).notNullable();
  table.timestamp('updated_at', { precision: 6 }).notNullable();
  table.string('original_name').notNullable();
  table.string('mimetype').notNullable();
  table.enu('category', ['image', 'sticker', 'video', 'audio', 'document']).notNullable();
  table.integer('size').notNullable();
  table.string('extension').notNullable();
  table.string('path');
  table.dateTime('processed_at');
  table.string('fileable_type');
  table.string('fileable_id');

  table.index(['fileable_type', 'fileable_id']);
});

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = (knex) => knex.schema.dropTable('file_storages');
