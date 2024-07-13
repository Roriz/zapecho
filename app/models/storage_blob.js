const { queryBuilder, BaseModel } = require('./base_model.js');

class StorageBlob extends BaseModel {
  static table_name = 'storage_blobs';
}
const StorageBlobsQuery = () => queryBuilder(StorageBlob);

module.exports = StorageBlobsQuery;
