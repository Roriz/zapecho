const Message = require('~/models/message.js');
const WorkflowUser = require('~/models/workflow_user.js');
const { sendWhatsappMessage } = require('~/repositories/whatsapp_repository.js');

module.exports = async function whatsappSendService(messageParams) {
  if(!messageParams?.body) { throw new Error('Message body is required') }

  const workflowUser = await WorkflowUser().findOne('id', messageParams.workflow_user_id);
  
  const messageType = messageParams.message_type || messageParams.image ? 'image' : 'text';

  const message = await Message().insert({
    sender_type: 'agent',
    message_type: messageType,
    user_id: workflowUser.user_id,
    client_id: workflowUser.client_id,
    workflow_user_id: messageParams.workflow_user_id,
    channel_id: messageParams.channel_id,
    body: messageParams.body,
    image: messageParams.image,
    openai_id: messageParams.openai_message_id,
  });

  const response = await sendWhatsappMessage(message)

  await Message().where('id', message.id).update({
    whatsapp_id: response.messages[0].id,
    whatsapp_created_at: new Date(),
  });

  return message;
};
