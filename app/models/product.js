const { queryBuilder, BaseModel } = require('./base_model.js');
const StorageAttachments = require('~/models/storage_attachment.js');

class Product extends BaseModel {
  static table_name = 'products';

  photoAttachment() {
    return StorageAttachments().where({
      category: 'photo',
      storable_type: 'product',
      storable_id: this.id,
    }).first();
  }
}

const ProductsQuery = () => queryBuilder(Product);

module.exports = ProductsQuery;
