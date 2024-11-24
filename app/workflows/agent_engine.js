const camelCase = require('lodash/camelCase');
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

function compileMessage(run) {
  const contextVariables = {
    client_name: 'client_name',
    clinic_address: 'clinic_address',
    clinic_phone: 'clinic_phone',
    clinic_website: 'clinic_website',
    assistant_name: 'assistant_name',
  };

  run.compiled_message_body = run.message_body;
  Object.values(run.variables || {}).forEach(variable => {
    run.compiled_message_body = run.compiled_message_body.replaceAll(
      variable.raw,
      contextVariables[variable.name]
    ).trim();
  });

  return run;
}


function saveDataAddonPrompt(dataToExtract) {
  if (!Object.keys(dataToExtract).length) { return ''; }
  
  const args = [];
  const descriptions = [];
  for (const [key, value] of Object.entries(dataToExtract)) {
    args.push(`${key}?: ${value.type}`);
    descriptions.push(`- ${key}: ${value.description}`);
  }

  return `#### addon {{ save_data(${args.join(', ')}) }}
Save the data extracted from the user's response. Use the following arguments:
${descriptions.join('\n')}`
}

const BASE_PROMPT = ``

function generateFullPrompt(agent) {
  return `${BASE_PROMPT}

${agent.prompt()}

${saveDataAddonPrompt(agent.dataToExtract())}`;
}

async function agentRun(agent) {
  if (await agent.isCompleted()) { return agent.success(); }

  const extractedData = await ExtractDataService(agent.thread, agent.dataToExtraction());
  if (Object.keys(extractedData).length) {
    await agent.onDataChange(extractedData);

    if (await agent.isCompleted()) { return agent.success(); }
  }

  await agent.onBeforeRun()

  let run = await threadRun(agent.thread, generateFullPrompt(agent));

  for (const func in Object.values(run.functions)) {
    const functioName = `on${func.name.charAt(0).toUpperCase()}${camelCase(func.name.slice(1))}`;
    if (agent[functioName] && typeof agent[functioName] === 'function') {
      const runUpdated = await agent[functioName](func.arguments, run);
      if (runUpdated) { run = runUpdated; }
    }
  }
  // TODO: function save_data
  // TODO: function change_step
  const runUpdated = await agent.onAfterRun(run);
  if (runUpdated) { run = runUpdated; }

  if (run.force_rerun) {
    await openaiSDK().beta.threads.messages.del(agent.thread.openai_thread_id, run.openai_message_id);
    return await agentRun(agent);
  }

  run = compileMessage(run);
  await AgentRuns().updateOne(run, run);

  return run;
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

    const lastMessage = await Messages().where('thread_id', thread.id).orderBy('created_at', 'desc').limit(1)[0];
    let statusHistory = [];
    do {
      statusHistory.push(thread.status);
      if (statusHistory.length > 5) { throw new Error(`[agentEngineOpenai][${thread.id}] Status loop detected - ${statusHistory.join(' -> ')}`); } // TODO: call the boss agent

      const run = await agentRun(agent);

      const lm = await Messages().where('thread_id', thread.id).orderBy('created_at', 'desc').limit(1)[0];
      if (lm.id !== lastMessage.id) { throw new Error(`[agentEngineOpenai][${thread.id}] New message detected`); } // skip?

      if (run?.message_body) { await whatsappHumanSendMessages(run, lastMessage.channel_id); }
      if (run?.next_status) { thread = await Threads().updateOne(thread, { status: run.next_status }); }
    } while (run?.next_status);

    return thread;
  }
}
