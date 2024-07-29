const OpenAI = require('openai');
const envParams = require('#/configs/env_params.js');

const DEFAULT_MODEL = 'gpt-4o-mini'
let openai;

function openaiSDK() {
  if (openai) return openai;

  openai = new OpenAI({
    apiKey: envParams().openai_api_key,
    project: envParams().openai_project_id,
  });

  return openai
}

async function threadRun(thread_id, assistant_id, prompt) {
  const agentRunParams = {
    message_body: undefined,
    openai_run_id: undefined,
    openai_message_id: undefined,
    total_tokens: undefined,
    actions: [],
  }

  console.log('[openai][threadRun] thread_id:', thread_id, 'assistant_id:', assistant_id, 'prompt:', prompt)
  const run = openaiSDK().beta.threads.runs.stream(
    thread_id, {
    assistant_id,
    additional_instructions: prompt,
    stream: true,
  }).on('event', ({event, data}) => {
    if (event === 'thread.run.step.completed') {
      agentRunParams.total_tokens = data.usage.total_tokens
    } else if (event === 'thread.message.completed') {
      agentRunParams.openai_run_id = data.run_id
      agentRunParams.openai_message_id = data.id
      agentRunParams.message_body = data.content[0].text.value
    }
  })

  await run.finalRun();
  
  const actions = agentRunParams.message_body?.match(/#(\w|-)+/g) || [];
  if (actions.length) {
    agentRunParams.actions = { list: actions};
    actions.forEach(action => {
      agentRunParams.message_body = agentRunParams.message_body.replaceAll(action, '').trim();
    })
  }

  return agentRunParams;
}

function deleteThreadMessage(thread_id, message_id) {
  return openaiSDK().beta.threads.messages.del(thread_id, message_id);
}

async function functionCall(messages, functionAndSchema, options = { model, temperature }) {
  const response = await openaiSDK().chat.completions.create({
    messages,
    functions: [functionAndSchema],
    tools: [{ type: 'function', function: functionAndSchema }],
    tool_choice: {
      type: 'function',
      function: { name: functionAndSchema.name }
    },
    model: options.model ?? DEFAULT_MODEL,
    temperature: options.temperature ?? 0.2,
  });

  return JSON.parse(response.choices[0].message.tool_calls[0].function.arguments);
}

async function completionCall(messages, options = {}) {
  const response = await openaiSDK().chat.completions.create({
    messages,
    model: options.model ?? DEFAULT_MODEL,
    temperature: options.temperature ?? 0.2,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}


module.exports = {
  default: openaiSDK,
  openaiSDK,
  threadRun,
  deleteThreadMessage,
  completionCall,
  functionCall
}
