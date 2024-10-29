const OpenAI = require('openai');
const fromPairs = require('lodash/fromPairs');
const isEmpty = require('lodash/isEmpty');
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

function _extract_functions(message) {
  if (!message) return {};

  const calls = message.match(/{{\s*(.+)\s*}}/g) || []; // {{ example_function(arg1: 'a', arg2: ['c', 'd']) }}
  const functions = calls.map(call => {
    let [_, name, raw_arguments] = call.match(/(\w+)\((.*?)\)/); // _, example_function, arg1: 'a', arg2: ['c', 'd']

    if (!name) { return }

    let arguments
    if (raw_arguments) {
      // FIXME: remove this unsafe eval for some more complex parsing
      eval(`arguments = {${raw_arguments}}`) // { arg1: 'a', arg2: ['c', 'd'] }
    }

    return [name, { name, arguments, raw: call }];
  }).filter(Boolean); // [['example_function', { name: 'example_function', arguments: { arg1: 'a', arg2: ['c', 'd'] } ]]

  return fromPairs(functions); // { example_function: { name: 'example_function', arguments: { arg1: 'a', arg2: ['c', 'd'] } } }
}

function _extract_variables(message) {
  if (!message) return {};

  const calls = message.match(/{{\s*(\w+)\s*}}/g) || []; // {{ example_variable }}
  const variables = calls.map(call => {
    let [_, name] = call.match(/\w+/); // _, example_variable

    return [name, { name, raw: call }];
  }); // [['example_variable', { name: 'example_variable', raw: '{{ example_variable }}' }]]

  return fromPairs(variables); // { example_variable: { name: 'example_variable' } } }
}

async function threadRun(thread_id, assistant_id, prompt) {
  const agentRunParams = {
    message_body: undefined,
    openai_run_id: undefined,
    openai_message_id: undefined,
    total_tokens: undefined,
    functions: {},
  }

  console.info('[openai][threadRun] thread_id:', thread_id, 'assistant_id:', assistant_id, 'prompt:', prompt)
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

  if (!agentRunParams.openai_run_id) { threadRun(thread_id, assistant_id, prompt) }

  console.debug('[openai][threadRun] agentRunParams:', agentRunParams)
  
  agentRunParams.functions = _extract_functions(agentRunParams.message_body);
  Object.values(agentRunParams.functions).forEach(f => {
    agentRunParams.message_body = agentRunParams.message_body.replaceAll(
      `{{ ${f.raw} }}`, ''
    ).replaceAll(`{{${f.raw}}}`, '').trim();
  })

  agentRunParams.variables = _extract_variables(agentRunParams.message_body);

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
