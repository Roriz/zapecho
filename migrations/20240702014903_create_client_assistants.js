/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.all([
    knex.schema.createTable('clients_assistants', function(table) {
      table.increments('id').primary();
      table.timestamp('created_at', { precision: 6 }).notNullable();
      table.timestamp('updated_at', { precision: 6 }).notNullable();
  
      table.text('instructions').notNullable();
      table.string('assistant_name').notNullable();
      table.string('model').notNullable();
      table.integer('client_id').unsigned().notNullable();
      table.string('category').notNullable().defaultTo('default');
      table.string('locale_iso2').notNullable().defaultTo('en');
      table.string('openai_id');
      table.timestamp('openai_created_at', { precision: 6 });
  
      table.unique(['client_id', 'category']);
      table.foreign('client_id').references('clients.id').onDelete('CASCADE');
    }),
    knex.schema.alterTable('clients', function(table) {
      table.dropColumn('assistant_instructions');
      table.dropColumn('openai_assistant_id');
    })
  ])
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return Promise.all([
    knex.schema.alterTable('clients', function(table) {
      table.text('assistant_instructions');
      table.string('openai_assistant_id');
    }),
    knex.schema.dropTable('clients_assistants')
  ])
};
