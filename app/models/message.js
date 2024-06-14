const getDb = require('./base_model.js');

/**
 * @typedef {Object} Message
 *
 * @property {number} id - The primary key of the table.
 * @property {Date} created_at - The timestamp when the record was created.
 * @property {Date} updated_at - The timestamp when the record was last updated.
 * @property {number} user_id - The user id.
 * @property {number} client_id - The client id.
 * @property {number} workflow_user_id - The workflow user id.
 * @property {string} body - The message body.
 * @property {string} sender_type - The sender type. E.g. user, client, agent.
 * @property {string} message_type - The message type. E.g. text, image, etc.
 * @property {string} template_name - The template name.
 * @property {string} template_locale - The template locale.
 * @property {Object} template_payload - The template payload.
 * @property {string} user_reaction - The user reaction.
 * @property {Date} user_reacted_at - The timestamp of the user reaction.
 * @property {Date} user_read_at - The timestamp of the user read.
 * @property {Date} client_read_at - The timestamp of the client read.
 * @property {string} whatsapp_id - The WhatsApp id.
 * @property {Date} whatsapp_created_at - The timestamp of the WhatsApp creation.
 * @property {string} openai_id - The OpenAI id.
 *
 * @returns {Knex.QueryBuilder<Message, {}>}
 */
const Messages = () => getDb('messages');

module.exports = Messages;
