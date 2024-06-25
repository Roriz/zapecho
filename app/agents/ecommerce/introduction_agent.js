const { threadRun } = require('~/repositories/openai_repository.js');
const { dataExtractor } = require('~/repositories/openai/data_extractor_repository.js');
const Messages = require('~/models/message.js');
const Clients = require('~/models/client.js');
const AgentRuns = require('~/models/agent_run.js');

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

async function extract_workflow_data(workflowUser) {
  const lastRelevantMessages = await Message().lastRelevantMessages(workflowUser.id);
  const extractedData = await dataExtractor(lastRelevantMessages, DATA_TO_EXTRACT);

  if (extractedData) {
    return WorkflowUser().updateOne(workflowUser, { extracted_data: {...workflowUser.extracted_data, ...extractedData} });
  } else {
    return workflowUser
  }
}

const PROMPT = `
act as sales representative and welcome the user and introduce the company. Be responsive and helpful.
Your goal is to make the user be interested in any product or make a search, but don't be too pushy.

**Attachs**
If you thinking is fit for the message, you can attach stuff on the message. Available attachments:
#product_of_the_day: Attach image and small description of a product of the day at the end of the message.

**Actions**
In case the user shows interest in products or make a search, respond with #search without any other text.
`

module.exports = {
  run: async function introductionAgent(workflowUser) {
    workflowUser = await extract_workflow_data(workflowUser);
    if (workflowUser.extracted_data.user_wants_to_see_products || workflowUser.extracted_data.user_request_a_search_or_product_detail) {
      return AgentRuns().insert({
        agent_slug: 'introduction',
        workflow_user_id: workflowUser.id,
        workflow_user_status: workflowUser.status,
        is_complete: true
      });
    }

    const client = await Clients().findOne('id', workflowUser.client_id);

    const agentRunParams = await threadRun(
      workflowUser.openai_thread_id,
      client.openai_assistant_id,
      PROMPT
    );

    if (agentRunParams.actions.includes('#search')) {
      return AgentRuns().insert({
        agent_slug: 'introduction',
        workflow_user_id: workflowUser.id,
        workflow_user_status: workflowUser.status,
        is_complete: true,
        actions: agentRunParams.actions,
        openai_run_id: agentRunParams.openai_run_id,
        openai_message_id: agentRunParams.openai_message_id,
        total_tokens: agentRunParams.total_tokens,
      });
    } else {
      return  AgentRuns().insert({
        agent_slug: 'introduction',
        workflow_user_id: workflowUser.id,
        workflow_user_status: workflowUser.status,
        is_complete: false,
        message_body: agentRunParams.message_body,
        actions: agentRunParams.actions,
        openai_run_id: agentRunParams.openai_run_id,
        openai_message_id: agentRunParams.openai_message_id,
        total_tokens: agentRunParams.total_tokens,
      });
    }
  }
}
