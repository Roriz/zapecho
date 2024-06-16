const OpenAI = require('openai');

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
