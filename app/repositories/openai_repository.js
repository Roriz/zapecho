const OpenAI = require('openai');

const DEFAULT_MODEL = 'gpt-3.5-turbo'

module.exports = function openaiRepository() {
  return new OpenAI();
}

module.openaiSDK = openaiRepository

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
