const { threadRun } = require('~/repositories/openai_repository.js');
const Clients = require('~/models/client.js');
const AgentRuns = require('~/models/agent_run.js');
const ExtractDataService = require('~/services/workflow_users/extract_data_service.js');

const DATA_TO_EXTRACT = {
  has_gone_too_pushy: {
    type: 'boolean',
    description: 'Assistant already made the last attempt, but the user did not show interest in products or make a search.'
  },
  assistant_already_says_goodbye: {
    type: 'boolean',
    description: 'Assistant already made the farewell message to the user.'
  },
}

const LAST_TRY_PROMPT = `
act as senior customer experience and make a last attempt to keep the user engaged. Be responsive and helpful.
your goal is discover what has gone wrong and try to solve the problem one last time. Don't be too pushy.

**Actions**
In case the user shows interest in products or make a search, respond with #search.
`

const FAREWELL_PROMPT = `
act as senior customer experience and make the farewell message to the user.
your goal is to make the user feel comfortable and welcome to come back later.
`
const AGENT_SLUG = 'ecommerce-cancelled';
module.exports = {
  run: async function cancelledAgent(workflowUser) {
    let prompt = LAST_TRY_PROMPT
    
    workflowUser = await ExtractDataService(workflowUser, DATA_TO_EXTRACT);
    if (workflowUser.answers_data.assistant_already_says_goodbye) { 
      return AgentRuns().insert({
        agent_slug: AGENT_SLUG,
        workflow_user_id: workflowUser.id,
        workflow_user_status: workflowUser.status,
        is_complete: true
      });
    }

    if (workflowUser.answers_data.has_gone_too_pushy) {
      prompt = FAREWELL_PROMPT
    }
    
    const client = await Clients().findOne('id', workflowUser.client_id);
    const agentRunParams = await threadRun(
      workflowUser.openai_thread_id,
      client.openai_assistant_id,
      prompt
    );

    if (agentRunParams.actions.list?.includes('#search')) {
      agentRunParams.is_complete = true;
      agentRunParams.next_status = 'search';
    }

    return  AgentRuns().insert({
      ...agentRunParams,
      agent_slug: AGENT_SLUG,
      workflow_user_id: workflowUser.id,
      workflow_user_status: workflowUser.status,
    });
  }
}
