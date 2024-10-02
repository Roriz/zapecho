const Messages = require('~/models/message.js');
const WorkflowUsers = require('~/models/workflow_user.js');
const StorageAttachments = require('~/models/storage_attachment.js');
const { openaiSDK } = require('~/repositories/openai_repository.js');
const { dataExtractor } = require('~/repositories/openai/data_extractor_repository.js');
const { addMessageToThread } = require('~/repositories/openai/add_message_to_thread_repository.js');
const { whatsappHumanSendMessages } = require('~/services/whatsapp/human_send_service.js');

const { EcommerceIntroductionAgent } = require('~/agents/ecommerce/introduction_agent.js')
const { EcommerceSearchAgent } = require('~/agents/ecommerce/search_agent.js')
const { EcommerceCancelledAgent } = require('~/agents/ecommerce/cancelled_agent.js')

const STATUS_TO_AGENT = {
  'introduction': EcommerceIntroductionAgent,
  'search': EcommerceSearchAgent,
  // 'cart': () => require('~/agents/ecommerce/cart_agent.js'),
  // 'signup': () => require('~/agents/ecommerce/signup_agent.js'),
  // 'payment': () => require('~/agents/ecommerce/payment_agent.js'),
  // 'order_confirmation': () => require('~/agents/ecommerce/order_confirmation_agent.js'),
  'cancelled': EcommerceCancelledAgent,
}

const FIRST_STATUS = 'introduction';

async function _createThread(workflowUser) {
  const thread = await openaiSDK().beta.threads.create();

  return WorkflowUsers().updateOne(workflowUser, { openai_thread_id: thread.id });
}

async function _addMessagesToThread(workflowUser) {
  const messages = await Messages().where('workflow_user_id', workflowUser.id).whereNull('openai_id').orderBy('created_at', 'asc');
  return Promise.all(messages.map(async (message) => {
    if (!message.body) { return; }

    const threadMessage = await addMessageToThread(workflowUser.openai_thread_id, message);
    await Messages().updateOne(message, { openai_id: threadMessage.id });

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
async function _extract_guard_rails_data(workflowUser) {
  const lastRelevantMessages = await Messages().lastRelevantMessages(workflowUser.id);
  const extractedData = await dataExtractor(lastRelevantMessages, DATA_TO_EXTRACT);

  if (extractedData) {
    return workflowUser.addAnswerData(extractedData)
  } else {
    return workflowUser
  }
}

module.exports = async function ecommerceDemoWorkflow(workflowUser) {
  console.info('[workflows/ecommerce_demo_workflow] starting');
  if (!workflowUser.openai_thread_id) {
    workflowUser = await _createThread(workflowUser)
  }

  await _addMessagesToThread(workflowUser)
  console.info('[workflows/ecommerce_demo_workflow] added messages to thread');

  const lastUnrespondedMessages = await Messages().where('sender_type', 'user').lastRelevantMessages(workflowUser.id);
  workflowUser = await _extract_guard_rails_data(workflowUser);
  const channelId = lastUnrespondedMessages.at(-1).channel_id;

  // TODO: improve the guard rails
  if (workflowUser.answers_data?.the_subject_is_not_relevant) {
    Messages().where('id', lastUnrespondedMessages.map(m => m.id)).update({ ignored_at: new Date() }); 
    return workflowUser;
  } else if (workflowUser.answers_data?.user_do_not_want_to_continue) {
    workflowUser = await WorkflowUsers().updateOne(workflowUser, { status: 'cancelled' });
  } 
  
  if (!workflowUser.status) {
    workflowUser = await WorkflowUsers().updateOne(workflowUser, { status: FIRST_STATUS });
  }
  console.info('[workflows/ecommerce_demo_workflow] data extracted and passed guard rails');

  const Agent = STATUS_TO_AGENT[workflowUser.status]
  if (!Agent) {
    throw new Error(`Agent not found for status ${workflowUser.status}`);
  }

  const agentRun = await Agent.run(workflowUser);
  console.info('[workflows/ecommerce_demo_workflow] agent runned');
  
  // TODO: validate if need to send a message
  await whatsappHumanSendMessages(agentRun, channelId);
  console.info('[workflows/ecommerce_demo_workflow] messages sent');
  
  if (agentRun.is_complete) {
    if (agentRun.next_status) {
      workflowUser = await WorkflowUsers().updateOne(workflowUser, { status: agentRun.next_status });
    }

    // HANK: we need a flag to know if the agentRun need or not run again
    if (!agentRun.message_body) {
      return ecommerceDemoWorkflow(workflowUser);
    }
  }

  return workflowUser;
}
