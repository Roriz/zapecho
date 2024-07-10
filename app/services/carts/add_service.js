const Carts = require('~/models/cart.js');
const Products = require('~/models/product.js');

const findProduct = async (params) => {
  if (params.product_code) {
    return Products().where('code', params.product_code).first();
  }
  return Products().where('id', params.product_id).first();
}

async function addCart(params) {
  const product = await findProduct(params);
  
  return Carts().insert({
    user_id: params.user_id,
    client_id: params.client_id,
    quantity: params.quantity,
    product_id: product.id,
    price: product.price,
    total_price: product.price * params.quantity,
  });
}

module.exports = { addCart };
