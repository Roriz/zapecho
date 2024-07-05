/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('storage_attachments', (table) => {
    table.increments('id').primary();
    table.timestamp('created_at', { precision: 6 }).notNullable();
    table.timestamp('updated_at', { precision: 6 }).notNullable();
    table.string('storable_type').notNullable();
    table.string('storable_id').notNullable();
    table.integer('storage_blob_id').unsigned().notNullable();
    table.string('category').notNullable();

    table.index(['storable_type', 'storable_id']);
    table.unique(['storable_type', 'storable_id', 'storage_blob_id']);
    table.foreign('storage_blob_id').references('storage_blobs.id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('storage_attachments');
};
