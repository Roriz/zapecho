const Messages = require('~/models/message.js');
const WorkflowUsers = require('~/models/workflow_user.js');
const { openaiSDK } = require('~/repositories/openai_repository.js');
const { dataExtractor } = require('~/repositories/openai/data_extractor_repository.js');
const { addMessageToThread } = require('~/repositories/openai/add_message_to_thread_repository.js');
const sendService = require('~/services/whatsapp/send_service.js');

const STATUS_TO_AGENT = {
  'introduction': () => require('~/agents/ecommerce/introduction_agent.js'),
  'search': () => require('~/agents/ecommerce/search_agent.js'),
  'product_detail': () => require('~/agents/ecommerce/product_detail_agent.js'),
  // 'cart': () => require('~/agents/ecommerce/cart_agent.js'),
  // 'signup': () => require('~/agents/ecommerce/signup_agent.js'),
  // 'payment': () => require('~/agents/ecommerce/payment_agent.js'),
  // 'order_confirmation': () => require('~/agents/ecommerce/order_confirmation_agent.js'),
  'cancelled': () => require('~/agents/ecommerce/cancelled_agent.js'),
}

const FIRST_STATUS = 'introduction';

async function createThread(workflowUser) {
  const thread = await openaiSDK().beta.threads.create();

  return WorkflowUsers().updateOne(workflowUser, { openai_thread_id: thread.id });
}

async function addMessagesToThread(workflowUser) {
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
async function extract_workflow_data(workflowUser) {
  const lastRelevantMessages = await Messages().lastRelevantMessages(workflowUser.id);
  const extractedData = await dataExtractor(lastRelevantMessages, DATA_TO_EXTRACT);

  if (extractedData) {
    return WorkflowUsers().updateOne(workflowUser, { extracted_data: {...workflowUser.extracted_data, ...extractedData} });
  } else {
    return workflowUser
  }
}

function getRandomBetween(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function wait(time) {
  return new Promise((resolve) => { setTimeout(resolve, time) });
}

// TODO: be agnostic to the send service using the channel as orchestrator
// the timer should be per channel config
async function sendMessages(agentRun, lastMessage) {
  let nextMessageAt = new Date(lastMessage.created_at);
  // nextMessageAt.setMinutes(nextMessageAt.getMinutes() + getRandomBetween(2, 5));
  
  const bodyMessages = agentRun.message_body?.trim()?.split('\n\n') || [];
  for (let bodyMessage of bodyMessages) {
    // const timeToSend = new Date().getTime() - nextMessageAt.getTime();

    // await wait(math.max(timeToSend, 0));
    await sendService({
      workflow_user_id: agentRun.workflow_user_id,
      openai_message_id: agentRun.openai_message_id,
      channel_id: lastMessage.channel_id,
      body: bodyMessage.trim(),
    })

    nextMessageAt = new Date();
    // nextMessageAt.setSeconds(nextMessageAt.getSeconds() + getRandomBetween(20, 50));
  }
}

module.exports = async function ecommerceDemoWorkflow(workflowUser) {
  if (!workflowUser.openai_thread_id) {
    workflowUser = await createThread(workflowUser)
  }

  await addMessagesToThread(workflowUser)
  const lastUnrespondedMessages = await Messages().where('sender_type', 'user').lastRelevantMessages(workflowUser.id)
  
  workflowUser = await extract_workflow_data(workflowUser)
  if (workflowUser.extracted_data?.the_subject_is_not_relevant) {
    Messages().where('id', lastUnrespondedMessages.map(m => m.id)).update({ ignored_at: new Date() }); 
    return workflowUser;
  } else if (workflowUser.extracted_data?.user_do_not_want_to_continue) {
    workflowUser = await WorkflowUsers().updateOne(workflowUser, { status: 'cancelled' });
  } 
  
  if (!workflowUser.status) {
    workflowUser = await WorkflowUsers().updateOne(workflowUser, { status: FIRST_STATUS });
  }

  const agent = STATUS_TO_AGENT[workflowUser.status]()
  const agentRun = await agent.run(workflowUser);
  
  // TODO: validate if need to send a message
  sendMessages(agentRun, lastUnrespondedMessages.at(-1));
  
  if (agentRun.is_complete) {
    workflowUser = await WorkflowUsers().updateOne(workflowUser, { status: agentRun.next_status });
    if (!agentRun.message_body) {
      return ecommerceDemoWorkflow(workflowUser);
    }
  }

  return workflowUser;
}
