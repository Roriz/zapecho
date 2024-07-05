const FileStorages = require('~/models/file_storage.js');
const fileStorageRepository = require('~/repositories/file_storage_repository.js');
const axios = require('axios');
const fs = require('fs');
const mime = require('mime-types');

async function fileStorageCreateService(params, fileableType, fileableId) {
  const file = params.file || {};
  let buffer = params.buffer || file.buffer;

  if (params.url && !buffer) {
    const url_is_remove = params.url.startsWith('https://');

    if (url_is_remove) {
      const response = await axios.get(params.url, { responseType: 'arraybuffer' });
      buffer = response.data;
      file.name = response.headers['content-disposition'].split('filename=')[1];
      file.mimetype = response.headers['content-type'];
      file.size = response.headers['content-length'];
      file.extension = file.name.split('.').pop();
    } else {
      buffer = fs.readFileSync(params.url)
      file.name = params.url.split('/').pop();
      file.size = fs.statSync(params.url).size;
      file.extension = file.name.split('.').pop();
      file.mimetype = mime.lookup(file.extension);
    }
  }

  const fileStorage = await FileStorages().insert({
    original_name: file?.name,
    mimetype: file?.mimetype,
    size: file?.size,
    extension: file?.extension,
    category: params.category,
    fileable_type: fileableType,
    fileable_id: fileableId,
  });

  const path = `attachs/${fileableType}/${fileableId}-${fileStorage.id}.${file?.extension}`;
  await fileStorageRepository.persist(buffer, path);

  await FileStorages().where('id', fileStorage.id).update({ path, processed_at: new Date() });

  return fileStorage;
}

module.exports = fileStorageCreateService;
