const getDb = require('./base_model.js');

/**
 * @typedef {Object} StorageBlobs
 *
 * @property {number} id - The primary key of the table.
 * @property {Date} created_at - The timestamp when the record was created.
 * @property {Date} updated_at - The timestamp when the record was last updated.
 * @property {string} original_name - The original name of the file.
 * @property {string} mimetype - The mimetype
 * @property {string} path - The path of the file.
 * @property {number} size - The size of the file.
 * @property {string} extension - The extension of the file.
 * @property {Date} processed_at - The timestamp when the file was processed.
 * 
 * @returns {Knex.QueryBuilder<StorageBlob, {}>}
 */
const StorageBlobs = () => getDb('storage_blobs');

module.exports = StorageBlobs;
