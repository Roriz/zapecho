const { threadRun } = require('~/repositories/openai_repository.js');
const Clients = require('~/models/client.js');
const AgentRuns = require('~/models/agent_run.js');
const ExtractDataService = require('~/services/workflow_users/extract_data_service.js');

const DATA_TO_EXTRACT = {
  cart_for_product_code: {
    type: 'string',
    description: 'The product code that the user want to add to the cart or empty not applicable',
  },
  user_wants_to_see_other_products: {
    type: 'boolean',
    description: `User demonstrates interest in seeing other products.`
  },
}

const PROMPT = `
act as customer service and help the user understand the product.
Your goal is to show the product details to the user and help them to make a decision.

**Actions**
Append #photo to attach the product image to the message.
In case the user wants to see more products, respond with #search.
In case the user wants to see the cart, respond with #see_cart.

The selected product is:
"""
# Purrfessional
Gato e criador, uma parceria de MIAU sucesso. 
A blusa Purrfessional é perfeita para você que leva a parceria com seu gato a sério! 😺

descrição visual: A blusa é branca com a estampa de um gato preto com óculos de sol e gravata borboleta.
cor: branca
"""
`

AGENT_SLUG = 'ecommerce-product-detail';
module.exports = {
  run: async function productDetailAgent(workflowUser) {
    workflowUser = await ExtractDataService(workflowUser, DATA_TO_EXTRACT);
    if (workflowUser.extracted_data.user_wants_to_see_other_products) { 
      return AgentRuns().insert({
        agent_slug: AGENT_SLUG,
        workflow_user_id: workflowUser.id,
        workflow_user_status: workflowUser.status,
        next_status: 'search',
        is_complete: true
      });
    }

    if (workflowUser.extracted_data.cart_for_product_code) {}
    
    const client = await Clients().findOne('id', workflowUser.client_id);
    const agentRunParams = await threadRun(
      workflowUser.openai_thread_id,
      client.openai_assistant_id,
      PROMPT
    );

    return  AgentRuns().insert({
      ...agentRunParams,
      agent_slug: AGENT_SLUG,
      workflow_user_id: workflowUser.id,
      workflow_user_status: workflowUser.status,
    });
  }
}
