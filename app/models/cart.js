const { queryBuilder, BaseModel } = require('./base_model.js');

class Cart extends BaseModel {
  static table_name = 'carts';
}

const CartsQuery = () => queryBuilder(Cart);

module.exports = CartsQuery;
