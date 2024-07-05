const StorageAttachments = require('~/models/storage_attachment.js');
const { CreateBlobService } = require('~/services/storage/create_blob_service.js');

async function createAttachmentService(attachmentParams) {
  if (!attachmentParams.storage_blob_id && attachmentParams.storage_blob) {
    const storageBlob = await CreateBlobService(attachmentParams.storage_blob);
    attachmentParams.storage_blob_id = storageBlob.id;
  }

  return StorageAttachments().insert({
    storage_blob_id: attachmentParams.storage_blob_id,
    category: attachmentParams.category,
    storable_type: attachmentParams.storable_type,
    storable_id: attachmentParams.storable_id,
  });
}

module.exports = { createAttachmentService };
