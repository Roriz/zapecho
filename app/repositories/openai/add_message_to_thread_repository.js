const { openaiSDK } = require('~/repositories/openai_repository');

const MESSAGE_TYPE_TO_AGENT_ROLE = {
  'user': 'user',
  'agent': 'assistant',
}

module.exports = {
  addMessageToThread: function addMessageToThread(thread_id, message_sender_type, message_body) {
    return openaiSDK().beta.threads.messages.create(
      thread_id,
      {
        role: MESSAGE_TYPE_TO_AGENT_ROLE[message_sender_type],
        content: message_body
      }
    );
  }
}
