const getDb = require('./base_model.js');

/**
 * @typedef {Object} AgentRun
 *
 * @property {number} id - The primary key of the table.
 * @property {Date} created_at - The timestamp when the record was created.
 * @property {Date} updated_at - The timestamp when the record was last updated.
 * @property {number} workflow_user_id - The foreign key to the workflow_users table.
 * @property {string} agent_slug - The foreign key to the agents table.
 * @property {boolean} finished - Whether the agent run has finished.
 * @property {string} message_body - The message body that the agent is responding to.
 * @property {string} openai_run_id - The OpenAI run ID.
 * @property {string} openai_message_id - The OpenAI message ID.
 * @property {number} total_tokens - The total number of tokens used in the run.
 *
 * @returns {Knex.QueryBuilder<AgentRun, {}>}
 */
const AgentRuns = () => {
  const query = getDb('agent_runs')

  const originalInsert = query.insert;
  query.insert = async function zeInsert(...args) {
    console.info(JSON.stringify({
      code: 'models/agent_run/insert',
      message: 'Inserting agent run',
      payload: args
    }));
    return originalInsert.bind(this, ...args)();
  };

  return query;
};

module.exports = AgentRuns;
