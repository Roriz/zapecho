const getDb = require('./base_model.js');

/**
 * @typedef {Object} FileStorages
 *
 * @property {number} id - The primary key of the table.
 * @property {Date} created_at - The timestamp when the record was created.
 * @property {Date} updated_at - The timestamp when the record was last updated.
 * @property {string} original_name - The original name of the file.
 * @property {string} path - The path of the file.
 * @property {string} type - The type of the file.
 * @property {number} size - The size of the file.
 * @property {string} extension - The extension of the file.
 * @property {string} fileable_type - The model name of the relation.
 * @property {string} fileable_id - The id of the relation.
 *
 * @returns {Knex.QueryBuilder<FileStorage, {}>}
 */
const FileStorages = () => getDb('file_storages');

module.exports = FileStorages;
