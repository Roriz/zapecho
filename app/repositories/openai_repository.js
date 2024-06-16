const OpenAI = require('openai');

const DEFAULT_MODEL = 'gpt-3.5-turbo'

module.exports = function openaiRepository() {
  return new OpenAI();
}

module.threadRun = async function threadRun(thread_id, assistant_id, PROMPT) {
  const stream = await openaiRepository().beta.threads.runs.create(
    thread_id, {
    assistant_id: assistant_id,
    additional_instructions: PROMPT,
    stream: true,
  });

  const agentRun = {
    message_body: undefined,
    openai_run_id: undefined,
    openai_message_id: undefined,
    total_tokens: undefined,
  }

  for await (const event of stream) {
    // if thread.message.completed get the message and id
    // if thread.run.step.completed get the tokens used
    console.log(event);
  }

  return agentRun;
}

module.functionCall = async function functionCall(messages, functionAndSchema, model = DEFAULT_MODEL) {
  const response = await openaiRepository().openai.chat.completions.create({
    messages,
    functions: [functionAndSchema],
    function_call: { name: functionAndSchema.name },
    model,
    temperature: 0.5
  });

  return JSON.parse(response.choices[0].message.function_call.arguments);
}

module.dataExtractor = async function dataExtractor(messages, fieldToExtract) {
  const fieldsWithExplicit = {}
  
  Object.keys(fieldToExtract).forEach((field) => {
    fieldsWithExplicit[field] = fieldToExtract[field];
    fieldsWithExplicit[`${field}_explicit`] = {
      type: 'boolean',
      description: `The user explicitly states, either directly or indirectly, something about: ${field}.`
    }
  });

  const response = await functionCall(messages, {
    name: 'data_extractor',
    description: 'Extracts data from the messages',
    parameters: {
      type: 'object',
      properties: fieldsWithExplicit
    }
  });

  const cleanedResponse = {}
  Object.keys(response).forEach((field) => {
    if (field.endsWith('_explicit')) { return; }
    if (!response[field] || !response[`${field}_explicit`]) { return }

    cleanedResponse[field] = response[field];
  });

  return cleanedResponse;
}
