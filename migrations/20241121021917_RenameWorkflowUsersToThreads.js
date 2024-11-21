/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.all([
    knex.schema.renameTable('workflow_users', 'threads'),
    knex.schema.table('messages', table => {
      table.renameColumn('workflow_user_id', 'thread_id');
    }),
    knex.schema.table('agent_runs', table => {
      table.renameColumn('workflow_user_id', 'thread_id');
      table.renameColumn('workflow_user_status', 'thread_status');
    }),
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return Promise.all([
    knex.schema.renameTable('threads', 'workflow_users'),
    knex.schema.table('messages', table => {
      table.renameColumn('thread_id', 'workflow_user_id');
    }),
    knex.schema.table('agent_runs', table => {
      table.renameColumn('thread_id', 'workflow_user_id');
      table.renameColumn('thread_status', 'workflow_user_status');
    }),
  ])
};
