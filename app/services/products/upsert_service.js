const pick = require('lodash/pick');
const Products = require('~/models/product.js');
const { createAttachmentService } = require('~/services/storage/create_attachment_service.js');

async function ProductsUpsertService(params) {
  let product = await Products().findOne({ code: params.code });

  const updatableFields = pick(
    params,
    ['name', 'price', 'client_id', 'description', 'visual_description', 'metadata']
  );

  if (product) {
    product = await Products().updateOne(product, updatableFields);
  } else {
    product = await Products().insert({
      ...updatableFields,
      code: params.code,
    });
  }

  if (params.photo_url || params.photo) {
    await createAttachmentService({
      category: 'photo',
      storable_type: 'product',
      storable_id: product.id,
      storage_blob: {
        url: params.photo_url,
        buffer: params.photo,
      }
    });
  }

  return product;
}

module.exports = { ProductsUpsertService };
