const FileStorages = require('../../models/file_storage.js');
const fileStorageRepository = require('../../repositories/file_storage_repository.js');

async function fileStorageCreateService(fileStorageParams, fileableType, fileableId) {
  const fileStorage = await FileStorages().insert({
    original_name: fileStorageParams.originalName,
    mimetype: fileStorageParams.mimetype,
    size: fileStorageParams.size,
    extension: fileStorageParams.extension,
    category: fileStorageParams.category,
    fileable_type: fileableType,
    fileable_id: fileableId,
  });

  const path = `attachs/${fileableType}/${fileableId}-${fileStorage.id}.${fileStorageParams.extension}`;

  await fileStorageRepository.persist(fileStorageParams.fileBuffer, path);

  await FileStorages().where('id', fileStorage.id).update({ path, processed_at: new Date() });

  return fileStorage;
}

module.exports = fileStorageCreateService;
