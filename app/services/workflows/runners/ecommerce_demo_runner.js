const Message = require('../../models/message.js');
const openaiRepository = require('../../repositories/openai_repository.js');

const MESSAGE_TYPE_TO_AGENT_ROLE = {
  'user': 'user',
  'agent': 'assistant',
}

const FIRST_STATUS = 'introduction';

const STATUS_TO_AGENT = {
  'introduction': () => require('../agents/introduction_agent.js'),
  // 'product_selection': 'product_selection',
  // 'payment': 'payment',
  // 'shipping': 'shipping',
  // 'finished': 'finished',
}

module.exports = async function ecommerceDemoRunner(workflowUser) {
  if (!workflowUser.openai_thread_id) {
    const thread = await openaiRepository().beta.threads.create();
    workflowUser.openai_thread_id = thread.id
    WorkflowUser().where('id', workflowUser.id).update({ openai_thread_id: thread.id });
  }

  // TODO: pagination or limit?
  const messages = await Message().where('workflow_user_id', workflowUser.id).whereNull('openai_id').orderBy('created_at', 'asc');
  const messagesPromises = messages.map(async (message) => {
    if (!message.body) { return; }

    const threadMessage = await openaiRepository().beta.threads.messages.create(
      workflowUser.openai_thread_id,
      {
        role: MESSAGE_TYPE_TO_AGENT_ROLE[message.sender_type],
        content: message.body
      }
    );

    Message().where('id', message.id).update({ openai_id: threadMessage.id });
  });
  await Promise.all(messagesPromises);
  
  if (!workflowUser.status) {
    workflowUser.status = FIRST_STATUS;
    WorkflowUser().where('id', workflowUser.id).update({ status: FIRST_STATUS });
  }

  const agent = STATUS_TO_AGENT[workflowUser.status];
  const agentRun = agent().run(workflowUser);

  sendMessage(agentRun)

  // textMessage = run the agent on thread
  // insert new message
  // send the message to whatsapp
}
