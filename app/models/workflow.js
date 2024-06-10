const getDb = require('./base_model.js');

/**
 * @typedef {Object} Workflow
 *
 * @property {number} id - The primary key of the table.
 * @property {Date} created_at - The timestamp when the record was created.
 * @property {Date} updated_at - The timestamp when the record was last updated.
 * @property {string} name - The name of the workflow.
 * @property {string} description - The description of the workflow.
 * @property {string} first_message - The first message of the workflow.
 *
 * @returns {Knex.QueryBuilder<Workflow, {}>}
 */
const Workflows = () => getDb('workflows');

module.exports = Workflows;
