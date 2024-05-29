import getDb from "./base-model.js";

/**
 * @typedef {Object} User
 *
 * @property {number} id - The primary key of the table.
 * @property {Date} created_at - The timestamp when the record was created.
 * @property {Date} updated_at - The timestamp when the record was last updated.
 * @property {string} identifier - A unique identifier for the record.
 * @property {string} name - The name of the record.
 * @property {Date} last_message_at - The timestamp of the last message.
 * @property {Date} last_user_interaction_at - The timestamp of the last user interaction.
 * @property {string} last_sender_type - The type of the last sender.
 * @property {number} unread_count - The count of unread messages, defaults to 0.
 *
 * @returns {Knex.QueryBuilder<User, {}>}
 */
const Users = () => getDb("users");

export default Users;
