const Messages = require('~/models/message.js');
const Threads = require('~/models/thread.js');
const Clients = require('~/models/client.js');
const { openaiSDK } = require('~/repositories/openai_repository.js');
const { addMessageToThread } = require('~/repositories/openai/add_message_to_thread_repository.js');
const { whatsappHumanSendMessages } = require('~/services/whatsapp/human_send_service.js');
const ExtractDataService = require('~/services/threads/extract_data_service.js');

const { MedicalSecretaryRecepcionistAgent } = require('~/agents/medical_secretary/recepcionist_agent.js')
const { MedicalSecretarySchedulerAgent } = require('~/agents/medical_secretary/scheduler_agent.js')
const { MedicalSecretaryNotIcpAgent } = require('~/agents/medical_secretary/not_icp_agent.js')
const { MedicalSecretaryFinanceAgent } = require('~/agents/medical_secretary/finance_agent.js')
const { MedicalSecretaryTooUrgentAgent } = require('~/agents/medical_secretary/too_urgent_agent.js')

const STATUS_TO_AGENT = {
  'recepcionist': MedicalSecretaryRecepcionistAgent,
  'schedule_appointment': MedicalSecretarySchedulerAgent,
  'payment': MedicalSecretaryFinanceAgent,
  'not_icp': MedicalSecretaryNotIcpAgent,
  'too_urgent': MedicalSecretaryTooUrgentAgent,
}

const FIRST_STATUS = 'recepcionist';

async function _createThread(workflowUser) {
  const thread = await openaiSDK().beta.threads.create();

  return Threads().updateOne(workflowUser, { openai_thread_id: thread.id });
}

async function _addMessagesToThread(workflowUser, client) {
  const messages = await Messages().where('thread_id', workflowUser.id).whereNull('openai_id').orderBy('created_at', 'asc');
  return Promise.all(messages.map(async (message) => {
    if (!message.body) { return; }

    const threadMessage = await addMessageToThread(
      workflowUser.openai_thread_id,
      message.sender_type,
      message.body === client.findable_message ? 'Hi' : message.body
    );
    await Messages().updateOne(message, { openai_id: threadMessage.id });

    return message;
  }));
}

const DATA_TO_EXTRACT = {
  user_want_to_stop_the_conversation: {
    type: 'boolean',
    description: `User ask explicitly to stop the conversation like: "I don't want to talk anymore" or "Stop talking to me" or similar. Be careful with litotes and sarcasm.`
  },
  // message_is_irrelevant: {
  //   type: 'boolean',
  //   description: `Return true if the message does not add value to a conversation with a medical secretary. The conversation may involve health, appointments, payments, confirmations, or clinic information.  Be careful with litotes and sarcasm.`
  // }
  // TODO: create a blocklist of topics
}

module.exports = async function medicalSecretaryWorkflow(workflowUser) {
  console.info('[workflows/medical_secretary_workflow] starting');
  if (!workflowUser.openai_thread_id) {
    workflowUser = await _createThread(workflowUser)
  }
  const client = await Clients().findOne('id', workflowUser.client_id);

  await _addMessagesToThread(workflowUser, client)
  console.info('[workflows/medical_secretary_workflow] added messages to thread');

  const lastUnrespondedMessages = await Messages().where('sender_type', 'user').lastRelevantMessages(workflowUser.id);
  const channelId = lastUnrespondedMessages.at(-1).channel_id;
  
  const extractedData = await ExtractDataService(workflowUser, DATA_TO_EXTRACT);
  workflowUser = await workflowUser.addAnswerData(extractedData);
  // TODO: improve the guard rails
  if (workflowUser.answers_data?.message_is_irrelevant) {
    Messages().where('id', lastUnrespondedMessages.map(m => m.id)).update({ ignored_at: new Date() }); 
    return workflowUser;
  } else if (workflowUser.answers_data?.user_want_to_stop_the_conversation) {
    workflowUser = await Threads().updateOne(workflowUser, { status: 'cancelled', finished_at: new Date() });
  }
  
  if (!workflowUser.status) {
    workflowUser = await Threads().updateOne(workflowUser, { status: FIRST_STATUS });
  }
  console.info('[workflows/medical_secretary_workflow] data extracted and passed guard rails');

  const Agent = STATUS_TO_AGENT[workflowUser.status]
  if (!Agent) {
    throw new Error(`Agent not found for status ${workflowUser.status}`);
  }

  const agentRun = await Agent.run(workflowUser);
  console.info('[workflows/medical_secretary_workflow] agent runned');
  
  // TODO: validate if need to send a message
  await whatsappHumanSendMessages(agentRun, channelId);
  console.info('[workflows/medical_secretary_workflow] messages sent');
  
  if (agentRun.is_complete) {
    if (agentRun.next_status) {
      workflowUser = await Threads().updateOne(workflowUser, { status: agentRun.next_status });
    }

    // HANK: we need a flag to know if the agentRun need or not run again
    if (!agentRun.message_body) {
      workflowUser = await Threads().findOne('id', workflowUser.id);
      return medicalSecretaryWorkflow(workflowUser);
    }
  }

  return workflowUser;
}
