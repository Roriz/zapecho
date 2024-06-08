const getDb = require('./base_model.js');

/**
 * @typedef {Object} Channel
 *
 * @property {number} id - The primary key of the table.
 * @property {Date} created_at - The timestamp when the record was created.
 * @property {Date} updated_at - The timestamp when the record was last updated.
 * @property {string} type - The type of the channel.
 * @property {string} external_id - The external id of the channel.
 *
 * @returns {Knex.QueryBuilder<Channel, {}>}
 */
const Channels = () => getDb('channels');

module.exports = Channels;
