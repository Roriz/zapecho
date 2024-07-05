const getDb = require('./base_model.js');

/**
 * @typedef {Object} StorageAttachments
 *
 * @property {number} id - The primary key of the table.
 * @property {Date} created_at - The timestamp when the record was created.
 * @property {Date} updated_at - The timestamp when the record was last updated.
 * @property {string} storable_type - The type of the file.
 * @property {string} storable_id - The id of the file.
 * @property {number} storage_blob_id - The id of the file storage.
 * @property {string} category - The category of the file.
 * 
 * @returns {Knex.QueryBuilder<StorageAttachment, {}>}
 */
const StorageAttachments = () => getDb('storage_attachments');

module.exports = StorageAttachments;
