const pick = require('lodash/pick');
const Products = require('~/models/product.js');
const fileStorageCreateService = require('~/services/file_storages/create_service.js');

async function ProductsUpsertService(params) {
  let product = await Products().findOne({ code: params.code });

  const updatableFields = pick(params, ['name', 'price', 'client_id', 'description', 'visual_description']);

  if (product) {
    product = await Products().updateOne(product, updatableFields);
  } else {
    product = await Products().insert({
      ...updatableFields,
      code: params.code,
    });
  }

  if (params.photo_url || params.photo) {
    await fileStorageCreateService({
      category: 'photo',
      buffer: params.photo,
      url: params.photo_url,
    }, 'product', product.id);
  }

  return product;
}

module.exports = { ProductsUpsertService };
