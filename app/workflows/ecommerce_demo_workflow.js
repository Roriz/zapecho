const Message = require('~/models/message.js');
const WorkflowUser = require('~/models/workflow_user.js');
const { openaiSDK } = require('~/repositories/openai_repository.js');
const { dataExtractor } = require('~/repositories/openai/data_extractor_repository.js');
const { nextAction } = require('~/repositories/openai/next_action_repository.js');
const sendService = require('~/services/whatsapp/send_service.js');

const MESSAGE_TYPE_TO_AGENT_ROLE = {
  'user': 'user',
  'agent': 'assistant',
}

const STATUS_TO_AGENT = {
  'introduction': () => require('../services/workflows/agents/ecommerce/introduction_agent.js'),
  'search': () => require('../agents/ecommerce/search_agent.js'),
  'product_detail': () => require('../agents/ecommerce/product_detail_agent.js'),
  'cart': () => require('../agents/ecommerce/cart_agent.js'),
  'signup': () => require('../functions/ecommerce/signup_agent.js'),
  'payment': () => require('../functions/ecommerce/payment_agent.js'),
  'order_confirmation': () => require('../functions/ecommerce/order_confirmation_agent.js'),
  'cancelled': () => require('../functions/ecommerce/cancelled_agent.js'),
}

const NEXT_STATUS_FOR = {
  'introduction': ['search', 'product_detail'],
  'search': ['product_detail', 'cart'],
  'product_detail': ['search', 'cart'],
  'cart': ['signup'],
  'payment': ['order_confirmation']
}

const FIRST_STATUS = 'introduction';

async function createThread(workflowUser) {
  const thread = await openaiSDK().beta.threads.create();

  return WorkflowUser().updateOne(workflowUser, { openai_thread_id: thread.id });
}

async function addMessagesToThread(workflowUser) {
  const messages = await Message().where('workflow_user_id', workflowUser.id).whereNull('openai_id').orderBy('created_at', 'asc');
  return Promise.all(messages.map(async (message) => {
    if (!message.body) { return; }

    const threadMessage = await openaiSDK().beta.threads.messages.create(
      workflowUser.openai_thread_id,
      {
        role: MESSAGE_TYPE_TO_AGENT_ROLE[message.sender_type],
        content: message.body
      }
    );

    Message().updateOne(message, { openai_id: threadMessage.id });

    return message;
  }));
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
    workflowUser = await createThread(workflowUser)
  }

  const messages = await addMessagesToThread(workflowUser)
  
  const lastRelevantMessages = await Message().lastRelevantMessages(workflowUser.id);
  const extractedData = await dataExtractor(lastRelevantMessages, DATA_TO_EXTRACT)
  if (extractedData.the_subject_is_not_relevant) {
    Message().where('id', messages.map(m => m.id)).where({ whatsapp_id: null }).update({ ignored_at: new Date() }); 
    return workflowUser;
  } else if (extractedData.user_do_not_want_to_continue) {
    workflowUser = await WorkflowUser().updateOne(workflowUser, { status: 'cancelled' });
  } 
  
  if (!workflowUser.status) {
    workflowUser = await WorkflowUser().updateOne(workflowUser, { status: FIRST_STATUS });
  }

  const agentRun = await STATUS_TO_AGENT[workflowUser.status]().run(workflowUser);

  await sendService(agentRun)
  
  if (agentRun.is_complete && !agentRun.message_body) {
    const nextStatus = await nextAction(lastRelevantMessages, NEXT_STATUS_FOR[workflowUser.status]);
    workflowUser = await WorkflowUser().updateOne(workflowUser, { status: nextStatus });

    return ecommerceDemoWorkflow(workflowUser);
  }

  return workflowUser;
}
