const { guardRails } = require('~/services/guard_rails/guard_last_messages');
const ExtractDataService = require('~/services/threads/extract_data_service.js');
const { openaiSDK, openaiFunctions } = require('~/repositories/openai_repository.js');
const { addMessageToThread } = require('~/repositories/openai/add_message_to_thread_repository.js');
const { whatsappHumanSendMessages } = require('~/services/whatsapp/human_send_service.js');
const Messages = require('~/models/message.js');
const Threads = require('~/models/thread.js');
const AgentRuns = require('~/models/agent_run.js');

async function threadRun(thread, prompt) {
  if (!thread.openai_thread_id) {
    const openaiThread = await openaiSDK().beta.threads.create();
    thread = await Threads().updateOne(thread, { openai_thread_id: openaiThread.id }); 
  }

  const messages = await Messages().where('thread_id', thread.id).whereNull('openai_id').orderBy('created_at', 'asc');
  await Promise.all(messages.map(async (message) => {
    if (!message.body) { return; }

    const threadMessage = await addMessageToThread(
      thread.openai_thread_id,
      message.sender_type,
      message.body
    );
    await Messages().updateOne(message, { openai_id: threadMessage.id });

    return message;
  }));
  
  const openaiRun = await openaiFunctions.threadRun(
    thread.openai_thread_id,
    thread.assistant_id,
    prompt
  );
  
  return await AgentRuns().insert({
    ...openaiRun,
    thread_id: thread.id,
    thread_status: thread.status,
  });
}

async function agentRun(agent) {
  if (await agent.isCompleted()) { return agent.success(); }

  await agent.beforeExtract()
  
  const extractedData = await ExtractDataService(agent.thread, agent.dataToExtraction());
  if (Object.keys(extractedData).length) {
    await agent.onDataChange(extractedData);
    agent.thread = await agent.thread.addAnswerData(extractedData);

    if (await agent.isCompleted()) { return agent.success(); }
  }

  await agent.beforeRun()

  const run = await threadRun(agent.thread, agent.prompt());

  for (const func in run.functions) {
    const functioName = `on${func.charAt(0).toUpperCase()}${func.slice(1)}`;
    if (agent[functioName] && typeof agent[functioName] === 'function') {
      await agent[functioName](run.functions[func].arguments);
    }
  }
  // TODO: function save_data
  // TODO: function change_step
  await agent.afterRun()

  return run;
}

async function sendResponse(thread, run) {
  const lastMessage = await Messages().where('thread_id', thread.id).orderBy('created_at', 'desc').limit(1)[0];

  const contextVariables = {
    client_name: 'client_name',
    clinic_address: 'clinic_address',
    clinic_phone: 'clinic_phone',
    clinic_website: 'clinic_website',
    assistant_name: 'assistant_name',
  };

  run.compiled_message_body = run.message_body;
  run.variables.forEach(variable => {
    run.compiled_message_body = run.compiled_message_body.replaceAll(
      variable.raw,
      contextVariables[variable.name]
    ).trim();
  });

  return await whatsappHumanSendMessages(run, lastMessage.channel_id);
}

const FIRST_STATUS = 'new'
module.exports = {
  agentEngine: async function agentEngine(threadId, agents) {
    console.info(`[agentEngineOpenai][${threadId}] starting`);
    let thread = await Threads().findOne('id', threadId);

    if (!thread.status) { thread = await setThreadStatus(thread, FIRST_STATUS); }

    if (thread.status in agents) { throw new Error(`[agentEngineOpenai][${thread.id}] Agent not found - ${thread.status}`); } // skip?
    const agent = new agents[thread.status](thread)

    const reason = await guardRails.guardLastMessages(agent);
    if (reason) { throw new Error(`[agentEngineOpenai][${thread.id}] guard rails failed: ${reason}`); } // skip?

    let statusHistory = [];
    do {
      statusHistory.push(thread.status);
      if (statusHistory.length > 5) { throw new Error(`[agentEngineOpenai][${thread.id}] Status loop detected - ${statusHistory.join(' -> ')}`); } // TODO: call the boss agent

      const run = await agentRun(agent);
      // TODO: break the loop if user send a message

      if (run?.message_body) { await sendResponse(thread, run); }
      if (run?.next_status) { thread = await Threads().updateOne(thread, { status: run.next_status }); }
    } while (run?.next_status);

    return thread;
  }
}
