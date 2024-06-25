const { openaiSDK } = require('~/repositories/openai_repository');

const MESSAGE_TYPE_TO_AGENT_ROLE = {
  'user': 'user',
  'agent': 'assistant',
}

module.exports = function addMessageToThread(thread_id, message) {
  return openaiSDK().beta.threads.messages.create(
    thread_id,
    {
      role: MESSAGE_TYPE_TO_AGENT_ROLE[message.sender_type],
      content: message.body
    }
  );
}
