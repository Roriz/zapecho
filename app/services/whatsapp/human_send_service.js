const StorageAttachments = require('~/models/storage_attachment.js');

const { whatsappSendService } = require('~/services/whatsapp/send_service.js');

async function whatsappHumanSendMessages(agentRun, channelId) {
  const attachments = await StorageAttachments().where('storable_type', 'agent_run').where('storable_id', agentRun.id);
  const bodyMessages = agentRun.message_body?.trim()?.split('\n\n') || [];

  for (let [index, bodyMessage] of bodyMessages.entries()) {
    if (!bodyMessage.trim()) { continue; }

    await whatsappSendService({
      workflow_user_id: agentRun.workflow_user_id,
      openai_message_id: agentRun.openai_message_id,
      channel_id: channelId,
      body: bodyMessage.trim(),
      message_type: 'text',
    })

    const reverseIndex = bodyMessages.length - index - 1;
    const attachment = attachments[reverseIndex];
    if (attachment) {
      await whatsappSendService({
        workflow_user_id: agentRun.workflow_user_id,
        openai_message_id: agentRun.openai_message_id,
        channel_id: channelId,
        message_type: 'image',
        image: attachment
      })
    }
  }

  const missing_attachments = attachments.slice(bodyMessages.length);
  for (let attachment of missing_attachments) {
    await whatsappSendService({
      workflow_user_id: agentRun.workflow_user_id,
      openai_message_id: agentRun.openai_message_id,
      channel_id: channelId,
      message_type: 'image',
      image: attachment
    })
  }
}

module.exports = {
  whatsappHumanSendMessages
}
