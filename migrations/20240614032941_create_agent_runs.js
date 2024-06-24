/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('agent_runs', (table) => {
    table.increments('id').primary();
    table.timestamp('created_at', { precision: 6 }).notNullable();
    table.timestamp('updated_at', { precision: 6 }).notNullable();
    table.integer('workflow_user_id').notNullable();
    table.string('workflow_user_status').notNullable();
    table.string('agent_slug').notNullable();
    table.text('message_body').notNullable();
    table.string('openai_run_id').notNullable();
    table.string('openai_message_id').notNullable();
    table.integer('total_tokens').notNullable();
    table.boolean('is_complete').defaultTo(false).notNullable();

    table.foreign('workflow_user_id').references('workflow_users.id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('agent_runs');
};
