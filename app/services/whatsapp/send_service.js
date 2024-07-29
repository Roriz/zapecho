const Message = require('~/models/message.js');
const WorkflowUser = require('~/models/workflow_user.js');

const { sendWhatsappMessage } = require('~/repositories/whatsapp_repository.js');
const { createAttachmentService } = require('~/services/storage/create_attachment_service.js');

module.exports = async function whatsappSendService(messageParams) {
  const workflowUser = await WorkflowUser().findOne('id', messageParams.workflow_user_id);
  
  const message = await Message().insert({
    sender_type: 'agent',
    user_id: workflowUser.user_id,
    client_id: workflowUser.client_id,
    message_type: messageParams.message_type,
    workflow_user_id: messageParams.workflow_user_id,
    channel_id: messageParams.channel_id,
    body: messageParams.body,
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

  const response = await sendWhatsappMessage(message)

  await Message().where('id', message.id).update({
    whatsapp_id: response.messages[0].id,
    whatsapp_created_at: new Date(),
  });

  return message;
};
