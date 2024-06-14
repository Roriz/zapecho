const getDb = require('./base_model.js');

/**
 * @typedef {Object} WorkflowUser
 *
 * @property {number} id - The primary key of the table.
 * @property {Date} created_at - The timestamp when the record was created.
 * @property {Date} updated_at - The timestamp when the record was last updated.
 * @property {number} user_id - The id of the user.
 * @property {number} workflow_id - The id of the workflow.
 * @property {string} status - The status of the workflow user.
 * @property {Date} finished_at - The timestamp when the user finished.
 * @property {Object} answers_data - The data of the answers.
 * @property {string} openai_thread_id - The id of the openai thread.
 *
 * @returns {Knex.QueryBuilder<WorkflowUser, {}>}
 */
const WorkflowUsers = () => getDb('workflow_users');

module.exports = WorkflowUsers;
