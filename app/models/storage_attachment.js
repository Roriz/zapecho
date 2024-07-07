const envParams = require('#/configs/env_params.js');
const { queryBuilder, BaseModel } = require('./base_model.js');
const { generateToken } = require('~/services/auth/jwt.js')

class StorageAttachment extends BaseModel {
  static table_name = 'storage_attachments';

  storable_type;
  storable_id;
  storage_blob_id;
  category;

  generateUrl() {
    return `${envParams().host_url}/v1/storage_blobs/${this.storage_blob_id}?t=${generateToken()}`;
  }
}
const StorageAttachmentsQuery = () => queryBuilder(StorageAttachment);

module.exports = StorageAttachmentsQuery;
