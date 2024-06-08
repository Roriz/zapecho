const getDb = require('./base_model.js');

/**
 * @typedef {Object} AgentUser
 *
 * @property {number} id - The primary key of the table.
 * @property {Date} created_at - The timestamp when the record was created.
 * @property {Date} updated_at - The timestamp when the record was last updated.
 * @property {number} user_id - The id of the user.
 * @property {number} agent_id - The id of the agent.
 * @property {string} current_step - The current step of the user.
 * @property {Date} final_step_at - The timestamp of the final step.
 * @property {Object} answers_data - The data of the answers.
 * @property {string} openai_thread_id - The id of the openai thread.
 *
 * @returns {Knex.QueryBuilder<AgentUser, {}>}
 */
const AgentUsers = () => getDb('agent_users');

module.exports = AgentUsers;
