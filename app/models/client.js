const getDb = require('./base_model.js');

/**
 * @typedef {Object} Client
 *
 * @property {number} id - The primary key of the table.
 * @property {Date} created_at - The timestamp when the record was created.
 * @property {Date} updated_at - The timestamp when the record was last updated.
 * @property {string} name - The name of the client.
 * @property {number} first_workflow_id - The ID of the first workflow.
 * @property {string} findable_message - A message that can be used to find the client.
 *
 * @returns {Knex.QueryBuilder<Client, {}>}
 */
const Clients = () => getDb('clients');

module.exports = Clients;
