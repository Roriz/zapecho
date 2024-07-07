const { queryBuilder, BaseModel } = require('./base_model.js');

class Product extends BaseModel {
  static table_name = 'products';

  client_id;
  name;
  code;
  description;
  visual_description;
  price;
}

const ProductsQuery = () => queryBuilder(Product);

module.exports = ProductsQuery;
