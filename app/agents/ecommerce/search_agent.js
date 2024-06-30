const { threadRun } = require('~/repositories/openai_repository.js');
const Clients = require('~/models/client.js');
const AgentRuns = require('~/models/agent_run.js');
const ExtractDataService = require('~/services/workflow_users/extract_data_service.js');

const DATA_TO_EXTRACT = {
  filter_by_theme: {
    type: 'string',
    description: 'The theme to filter the products or empty not applicable',
    enum: ['dark humor', 'funny', 'sarcastic'],
  },
  show_more_products: {
    type: 'boolean',
    description: 'If the user wants to see even more products or empty not applicable',
  },
  details_for_product_code: {
    type: 'string',
    description: 'The product code that the user want to see the details or empty not applicable',
  },
  cart_for_product_code: {
    type: 'string',
    description: 'The product code that the user want to add to the cart or empty not applicable',
  },
  see_cart: {
    type: 'boolean',
    description: 'If the user wants to see the cart or empty not applicable',
  },
}

const PROMPT = `
act as customer service and help the user find the right product. You will be the bridge between the user and the plataform, talking to the user and convert to filters for the plataform.
Your goal is find the right product for the user, using the filters based on the user's preferences.

filter available:
- theme: A theme of the T-shirt, possible values: ["dark humor", "funny", "sarcastic"]

**Actions**
In case the user wants to see more products, respond with #search.
In case the user wants to see the cart, respond with #see_cart.

Write #show-products to attach the products images on the message. The message can show up to 3 products. Products ready to show:
"""
1. Purrfessional - Gato e criador, uma parceria de MIAU sucesso.
2. Miados e Mordidas - Gato: Mestre da preguiça, criador: Discípulo dedicado.
3. Ronaldo das Patinhas: Meu gato joga bola? Só se for pra tirar o pó da casa!
"""
`

AGENT_SLUG = 'ecommerce-search';
module.exports = {
  run: async function searchAgent(workflowUser) {
    workflowUser = await ExtractDataService(workflowUser, DATA_TO_EXTRACT);
    if (workflowUser.extracted_data.details_for_product_code) { 
      return AgentRuns().insert({
        agent_slug: AGENT_SLUG,
        workflow_user_id: workflowUser.id,
        workflow_user_status: workflowUser.status,
        next_status: 'product_detail',
        is_complete: true
      });
    }
    
    if (workflowUser.extracted_data.see_cart) { 
      return AgentRuns().insert({
        agent_slug: AGENT_SLUG,
        workflow_user_id: workflowUser.id,
        workflow_user_status: workflowUser.status,
        next_status: 'cart',
        is_complete: true
      });
    }

    // next_page
    // if (workflowUser.extracted_data.show_more_products) {} 
    
    // filter products
    // if (workflowUser.extracted_data.filter_by_theme) {} 
    
    // add product to the cart
    // if (workflowUser.extracted_data.cart_for_product_code) {} 
    
    const client = await Clients().findOne('id', workflowUser.client_id);
    const agentRunParams = await threadRun(
      workflowUser.openai_thread_id,
      client.openai_assistant_id,
      PROMPT
    );

    if (agentRunParams.actions.includes('#search')) {
      agentRunParams.is_complete = true
      agentRunParams.next_status = 'search'
    } else if (agentRunParams.actions.includes('#see_cart')) {
      agentRunParams.message_body = null
      agentRunParams.is_complete = true
      agentRunParams.next_status = 'cart'
    }

    return  AgentRuns().insert({
      ...agentRunParams,
      agent_slug: AGENT_SLUG,
      workflow_user_id: workflowUser.id,
      workflow_user_status: workflowUser.status,
    });
  }
}
