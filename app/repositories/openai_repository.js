const OpenAI = require('openai');
const envParams = require('#/configs/env_params.js');

const DEFAULT_MODEL = 'gpt-3.5-turbo'
let openai;

function openaiSDK() {
  if (openai) return openai;

  openai = new OpenAI({
    apiKey: envParams().openai_api_key,
    project: envParams().openai_project_id,
  });

  return openai
}

async function threadRun(thread_id, assistant_id, PROMPT) {
  const agentRunParams = {
    message_body: undefined,
    openai_run_id: undefined,
    openai_message_id: undefined,
    total_tokens: undefined,
    actions: [],
  }

  const run = openaiSDK().beta.threads.runs.stream(
    thread_id, {
    assistant_id,
    additional_instructions: PROMPT,
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

  const actions = agentRunParams.message_body.match(/#(\w|-)+/g) || [];
  if (actions.length) {
    agentRunParams.actions = { list: actions};
    actions.forEach(action => {
      agentRunParams.message_body = agentRunParams.message_body.replaceAll(action, '').trim();
    })
  }

  return agentRunParams;
}

async function functionCall(messages, functionAndSchema, options = { model, temperature }) {
  const response = await openaiSDK().chat.completions.create({
    messages,
    functions: [functionAndSchema],
    function_call: { name: functionAndSchema.name },
    model: options.model ?? DEFAULT_MODEL,
    temperature: options.temperature ?? 0.5,
  });

  return JSON.parse(response.choices[0].message.function_call.arguments);
}


module.exports = {
  default: openaiSDK,
  openaiSDK,
  threadRun,
  functionCall
}
