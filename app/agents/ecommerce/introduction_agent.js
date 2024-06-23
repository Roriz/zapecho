const { threadRun, dataExtractor } = require('~/repositories/openai_repository.js');
const Clients = require('~/models/client.js');
const AgentRuns = require('~/models/agent_run.js');

const PROMPT = `
act as sales representative and welcome the user and introduce the company. Be responsive and helpful.
Your goal is to make the user be interested in any product or make a search, but don't be too pushy.

Next possible attach a product of the day as footer of the message. To do that, you will write #product_of_the_day at the end of your message.
`

const DATA_TO_EXTRACT = {
  user_wants_to_see_products: {
    type: 'boolean',
    description: `User demonstrates interest in seeing products.`
  },
  user_request_a_search_or_product_detail: {
    type: 'boolean',
    description: `User requests a search or a product detail.`
  }
}

module.exports = {
  run: async function introductionAgent(workflowUser) {
    const lastRelevantMessages = await Message().lastRelevantMessages(workflowUser.id)
    const data = dataExtractor(lastRelevantMessages, DATA_TO_EXTRACT)
    if (data.user_wants_to_see_products || data.user_request_a_search_or_product_detail) {
      return AgentRuns().insert({
        agent_slug: 'introduction',
        workflow_user_status: workflowUser.status,
        is_complete: true
      });
    }

    const client = await Clients().findOne('id', workflowUser.client_id);

    const agentRun = await threadRun(
      workflowUser.openai_thread_id,
      client.openai_assistant_id,
      PROMPT
    );

    // TODO: send footer or attach itens on the message
    // const nextAction = agentRun.message_body.match(/#(\w+)/)[1];

    return AgentRuns().insert({
      agent_slug: 'introduction',
      workflow_user_status: workflowUser.status,
      is_complete: false,
      message_body: agentRun.message_body,
      openai_run_id: agentRun.openai_run_id,
      openai_message_id: agentRun.openai_message_id,
      total_tokens: agentRun.total_tokens,
    });
  }
}
