const { queryBuilder, BaseModel } = require('./base_model.js');

class StorageBlob extends BaseModel {
  static table_name = 'storage_blobs';

  original_name;
  mimetype;
  path;
  size;
  extension;
  processed_at;
}
const StorageBlobsQuery = () => queryBuilder(StorageBlob);

module.exports = StorageBlobsQuery;
