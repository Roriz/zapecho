/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('workflow_users', (table) => {
    table.boolean('is_running').defaultTo(false);
    table.timestamp('last_runned_finished_at');
    table.timestamp('last_runned_failed_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('workflow_users', (table) => {
    table.dropColumn('is_running');
    table.dropColumn('last_runned_finished_at');
    table.dropColumn('last_runned_failed_at');
  });
};
