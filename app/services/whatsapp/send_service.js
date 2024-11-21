const Message = require('~/models/message.js');
const Threads = require('~/models/thread.js');
const ClientsAssistants = require('~/models/clients_assistant.js');

const { whatsappPostMessage } = require('~/repositories/whatsapp_repository.js');
const { createAttachmentService } = require('~/services/storage/create_attachment_service.js');
const { addStatiticsService } = require('~/services/threads/add_statitics_service.js');

async function whatsappSendService(messageParams) {
  const workflowUser = await Threads().findOne('id', messageParams.thread_id);
  const assistant = await ClientsAssistants().findOne('client_id', workflowUser.client_id);

  const message = await Message().insert({
    sender_type: 'agent',
    user_id: workflowUser.user_id,
    client_id: workflowUser.client_id,
    message_type: messageParams.message_type,
    thread_id: messageParams.thread_id,
    channel_id: messageParams.channel_id,
    body: messageParams.body,
    header: `${assistant.assistant_name}:`,
    footer: `${workflowUser.status} - ${workflowUser.current_step}`,
    openai_id: messageParams.openai_message_id,
  });
  if (messageParams.image) {
    await createAttachmentService({
      category: 'image',
      storable_type: 'message',
      storable_id: message.id,
      storage_blob_id: messageParams.image.storage_blob_id
    })
  }
  await addStatiticsService(workflowUser);
  const response = await whatsappPostMessage(message)

  await Message().where('id', message.id).update({
    whatsapp_id: response.messages[0].id,
    whatsapp_created_at: new Date(),
  });

  return message;
};

module.exports = { whatsappSendService }
