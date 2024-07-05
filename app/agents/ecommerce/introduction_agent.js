const { threadRun } = require('~/repositories/openai_repository.js');
const Messages = require('~/models/message.js');
const Clients = require('~/models/client.js');
const AgentRuns = require('~/models/agent_run.js');
const ExtractDataService = require('~/services/workflow_users/extract_data_service.js');

const DATA_TO_EXTRACT = {
  see_a_product_or_like_to_see_the_products: {
    type: 'boolean',
    description: `User demonstrates interest in seeing one or more products.`
  },
  product_name: {
    type: 'string',
    description: `The product name that the user want to see the details or empty not applicable`,
  },
  user_has_tried_to_search: {
    type: 'boolean',
    description: `User has tried to search for a product. Or try to find a product.`
  },
}

const PROMPT = `
act as sales representative and welcome the user and introduce the company. Be responsive and helpful.
Your goal is to make the user be interested in any product or make a search, but don't be too pushy.

**Attachs**
If you thinking is fit for the message, you can attach stuff on the message. Available attachments:
#product_of_the_day: Attach image and small description of a product of the day at the end of the message.

**Actions**
In case the user shows interest in products or make a search, respond with #search.
`
const DEFAULT_FIRST_MESSAGE = "Olá! Bem-vindo à Moda da MIMI! Como posso ajudar a tornar seu dia mais felino hoje? Está procurando por algo especial para se mimizar, né? 😸 Se precisar de ajuda para escolher uma blusa divertida ou tiver alguma pergunta, estou aqui para ajudar! Qual seria a sua 'miaufilia' do dia? 🐾";

AGENT_SLUG = 'ecommerce-introduction';
module.exports = {
  run: async function introductionAgent(workflowUser) {
    const client = await Clients().findOne('id', workflowUser.client_id);
    const lastMessage = await Messages().where('workflow_user_id', workflowUser.id).orderBy('created_at', 'desc').first();

    if (lastMessage.body === client.findable_message) {
      return { message_body: DEFAULT_FIRST_MESSAGE, workflow_user_id: workflowUser.id, is_complete: false };
    }

    workflowUser = await ExtractDataService(workflowUser, DATA_TO_EXTRACT);
    if (workflowUser.extracted_data.user_has_tried_to_search) {
      return AgentRuns().insert({
        agent_slug: AGENT_SLUG,
        workflow_user_id: workflowUser.id,
        workflow_user_status: workflowUser.status,
        next_status: 'search',
        is_complete: true
      });
    }
    if (workflowUser.extracted_data.see_a_product_or_like_to_see_the_products) {
      return AgentRuns().insert({
        agent_slug: AGENT_SLUG,
        workflow_user_id: workflowUser.id,
        workflow_user_status: workflowUser.status,
        next_status: 'product-detail',
        is_complete: true
      });
    }

    const agentRunParams = await threadRun(
      workflowUser.openai_thread_id,
      client.openai_assistant_id,
      PROMPT
    );

    if (agentRunParams.actions.list?.includes('#search')) {
      agentRunParams.message_body = null
      agentRunParams.is_complete = true
      agentRunParams.next_status = 'search'
    }
    
    return  AgentRuns().insert({
      ...agentRunParams,
      agent_slug: AGENT_SLUG,
      workflow_user_id: workflowUser.id,
      workflow_user_status: workflowUser.status,
    });
  }
}
