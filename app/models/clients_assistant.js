const getDb = require('./base_model.js');

/**
 * @typedef {Object} ClientsAssistant
 *
 * @property {number} id - The primary key of the table.
 * @property {Date} created_at - The timestamp when the record was created.
 * @property {Date} updated_at - The timestamp when the record was last updated.
 * @property {text} instructions - The instructions for the assistant.
 * @property {string} model - The model used by the assistant. Default is 'gpt-3.5-turbo'.
 * @property {number} client_id - The ID of the client.
 * @property {string} category - The category of the assistant. Default is 'default'.
 * @property {string} locale_iso2 - The locale of the assistant. Default is 'en'.
 * @property {string} openai_id - The ID of the assistant in OpenAI.
 * @property {Date} openai_created_at - The timestamp when the assistant was created in OpenAI.
 * 
 *
 * @returns {Knex.QueryBuilder<ClientsAssistant, {}>}
 */
const ClientsAssistants = () => getDb('clients_assistants');

module.exports = ClientsAssistants;
