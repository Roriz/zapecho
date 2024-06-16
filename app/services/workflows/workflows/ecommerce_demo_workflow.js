const Message = require('../../models/message.js');
const openaiRepository, { functionCall } = require('../../repositories/openai_repository.js');

const MESSAGE_TYPE_TO_AGENT_ROLE = {
  'user': 'user',
  'agent': 'assistant',
}

const STATUS_TO_AGENT = {
  'introduction': () => require('../agents/ecommerce/introduction_agent.js'),
  'search': () => require('../agents/ecommerce/search_agent.js'),
  'product_detail': () => require('../agents/ecommerce/product_detail_agent.js'),
  'cart': () => require('../agents/ecommerce/cart_agent.js'),
  'signup': () => require('../functions/ecommerce/signup_agent.js'),
  'payment': () => require('../functions/ecommerce/payment_agent.js'),
  'order_confirmation': () => require('../functions/ecommerce/order_confirmation_agent.js'),
  'cancelled': () => require('../functions/ecommerce/cancelled_agent.js'),
}
const FIRST_STATUS = 'introduction';

async function createThread(workflowUser) {
  const thread = await openaiRepository().beta.threads.create();
  WorkflowUser().where('id', workflowUser.id).update({ openai_thread_id: thread.id });
  return {
    ...workflowUser,
    openai_thread_id: thread.id
  }
}

async function addMessagesToThread(workflowUser) {
  const messages = await Message().where('workflow_user_id', workflowUser.id).whereNull('openai_id').orderBy('created_at', 'asc');
  return Promise.all(messages.map(async (message) => {
    if (!message.body) { return; }

    const threadMessage = await openaiRepository().beta.threads.messages.create(
      workflowUser.openai_thread_id,
      {
        role: MESSAGE_TYPE_TO_AGENT_ROLE[message.sender_type],
        content: message.body
      }
    );

    Message().where('id', message.id).update({ openai_id: threadMessage.id });

    return message;
  }));
}

async function setStatus(workflowUser, status) {
  WorkflowUser().where('id', workflowUser.id).update({ status });

  return {
    ...workflowUser,
    status: FIRST_STATUS
  }
}

const DATA_TO_EXTRACT = {
  user_do_not_want_to_continue: {
    type: 'boolean',
    description: `User says that does not want to continue the conversation.`
  },
  the_subject_is_not_relevant: {
    type: 'boolean',
    description: `
    User says that the subject is not relevant or false for any other case.
    Subject is far from the talk about the company, products or buying process.
    `
  }
}

module.exports = async function ecommerceDemoWorkflow(workflowUser) {
  if (!workflowUser.openai_thread_id) {
    workflowUser = await createThread()
  }

  addMessagesToThread(workflowUser)
  
  if (!workflowUser.status) {
    workflowUser = await setStatus(workflowUser, FIRST_STATUS);
  } else {
    const extractedData = dataExtractor(messages, DATA_TO_EXTRACT)
    if (extractedData.the_subject_is_not_relevant) { return workflowUser; }
    if (extractedData.user_do_not_want_to_continue) {
      workflowUser = await setStatus(workflowUser, 'cancelled');
    }
  }

  const agent = STATUS_TO_AGENT[workflowUser.status];
  const agentRun = await agent().run(workflowUser);

  await sendMessage(agentRun)

  return workflowUser;
}
