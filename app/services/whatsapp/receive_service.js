const User = require('../../models/user.js');
const Message = require('../../models/message.js');
const fileStorageCreateService = require('../file_storages/create_service.js');
const { downloadMedia } = require('../../repositories/whatsapp_repository.js');

const findOrInsertUser = async (params) => {
  const user = await User().where('identifier', params.wa_id).first();

  if (user) { return user; }

  return User().insert({
    identifier: params.wa_id,
    name: params.profile.name,
  });
};

const insertMessage = (params, user) => Message().insert({
  user_id: user.id,
  body: params.text?.body,
  message_type: params.type,
  whatsapp_id: params.id,
  whatsapp_created_at: new Date(params.timestamp * 1000),
  user_read_at: params.read_at,
});

const HAS_ATTACHMENT = ['image', 'sticker', 'video', 'audio', 'document'];

module.exports = async function whatsappReceiveService(userParams, messageParams) {
  const user = await findOrInsertUser(userParams);
  const message = await insertMessage(messageParams, user);

  if (HAS_ATTACHMENT.includes(messageParams.type)) {
    const mediaId = messageParams[messageParams.type].id;
    const fileStorageParams = await downloadMedia(mediaId);
    await fileStorageCreateService({
      category: messageParams.type,
      ...fileStorageParams,
    }, 'message', message.id);
  }

  return message;
};
