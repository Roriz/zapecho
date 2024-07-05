const StorageBlobs = require('~/models/storage_blob.js');
const { blobPersist } = require('~/repositories/blob_repository.js');
const axios = require('axios');
const fs = require('fs');
const mime = require('mime-types');

async function CreateBlobService(blobParams) {
  const blob = {};
  let buffer = blobParams.buffer;

  if (blobParams.url && !buffer) {
    const url_is_remote = blobParams.url.startsWith('https://');

    if (url_is_remote) {
      const response = await axios.get(blobParams.url, { responseType: 'arraybuffer' });
      buffer = response.data;
      blob.name = response.headers['content-disposition'].split('filename=')[1];
      blob.mimetype = response.headers['content-type'];
      blob.size = response.headers['content-length'];
      blob.extension = blob.name.split('.').pop();
    } else {
      buffer = fs.readFileSync(blobParams.url)
      blob.name = blobParams.url.split('/').pop();
      blob.size = fs.statSync(blobParams.url).size;
      blob.extension = blob.name.split('.').pop();
      blob.mimetype = mime.lookup(blob.extension);
    }
  }

  const storageBlob = await StorageBlobs().insert(blob)
  const path = `blobs/${storageBlob.id}.${blob.extension}`;
  await blobPersist(buffer, path);
  return StorageBlobs().updateOne(storageBlob, { path: blob.path });
}

module.exports = { CreateBlobService };
