const getDb = require('./base_model.js');

/**
 * @typedef {Object} Products
 * @property {number} id - The primary key of the table.
 * @property {Date} created_at - The timestamp when the record was created.
 * @property {Date} updated_at - The timestamp when the record was last updated.
 * @property {number} client_id - The client id of the product.
 * @property {string} name - The name of the product.
 * @property {string} code - The code of the product.
 * @property {string} description - The description of the product.
 * @property {string} visual_description - The visual description of the product.
 * @property {number} price - The price of the product.
 * 
 *
 * @returns {Knex.QueryBuilder<Products {}>}
 */
const Products = () => getDb('products');

module.exports = Products;
