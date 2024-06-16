const { threadRun } = require('../../repositories/openai_repository.js');
const Client = require('../../models/client.js');
const AgentRun = require('../../models/agent_run.js');

const PROMPT = `
act as sales representative and welcome the user and introduce the company. Be responsive and helpful.
Your goal is to make the user be interested in any product or make a search, but don't be too pushy.

Next possible attach a product of the day as footer of the message. To do that, you will write #product_of_the_day at the end of your message.
`

module.exports = {
  run: async function introductionAgent(workflowUser) {
    const client = await Client().findOne('id', workflowUser.client_id);

    const agentRun = await threadRun(
      workflowUser.openai_thread_id,
      client.openai_assistant_id,
      PROMPT
    );

    const nextAction = agentRun.message_body.match(/#(\w+)/)[1];

    return AgentRun().insert({
      agent_slug: 'introduction',
      next_action: nextAction,
      ...agentRun
    });
  }
}
