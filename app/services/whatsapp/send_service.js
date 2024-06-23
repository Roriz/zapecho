const Message = require('~/models/message.js');
const WorkflowUser = require('~/models/workflow_user.js');
const { sendWhatsappMessage } = require('~/repositories/whatsapp_repository.js');

module.exports = async function whatsappSendService(agentRun) {
  if(!agentRun?.message_body) { return }

  const workflowUser = await WorkflowUser().findOne('id', agentRun.workflow_user_id);
  
  const message = await Message().insert({
    workflow_user_id: agentRun.workflow_user_id,
    user_id: workflowUser.user_id,
    client_id: workflowUser.client_id,
    sender_type: 'agent',
    message_type: 'text',
    body: agentRun.message_body,
    openai_id: agentRun.openai_message_id,
  });

  const response = await sendWhatsappMessage(message)

  await Message().where('id', message.id).update({
    whatsapp_id: response.id,
    whatsapp_created_at: new Date(),
  });

  return message;
};
