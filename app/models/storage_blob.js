const fs = require('fs');
const path = require('path');

const { queryBuilder, BaseModel } = require('./base_model.js');

class StorageBlob extends BaseModel {
  static table_name = 'storage_blobs';

  getBlob() {
    return fs.readFileSync(path.resolve(this.path));
  }
}
const StorageBlobsQuery = () => queryBuilder(StorageBlob);

module.exports = StorageBlobsQuery;
