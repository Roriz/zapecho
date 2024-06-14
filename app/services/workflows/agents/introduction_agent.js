const openaiRepository = require('../../repositories/openai_repository.js');
const Client = require('../../models/client.js');
const AgentRun = require('../../models/agent_run.js');

const PROMPT = `
adsadasd
`

module.exports = {
  run: async function introductionAgent(workflowUser) {
    const client = await Client().findOne('id', workflowUser.client_id);

    const stream = await openaiRepository().beta.threads.runs.create(
      workflowUser.openai_thread_id, {
      assistant_id: client.openai_assistant_id,
      additional_instructions: PROMPT,
      stream: true,
    });

    const agentRun = {
      agent_slug: 'introduction',
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

    return AgentRun().insert(agentRun);
  }
}
