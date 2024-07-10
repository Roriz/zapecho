const { threadRun } = require('~/repositories/openai_repository.js');
const Clients = require('~/models/client.js');
const AgentRuns = require('~/models/agent_run.js');
const Products = require('~/models/product.js');
const Carts = require('~/models/cart.js');
const { addCart } = require('~/services/carts/add_service.js');
const ExtractDataService = require('~/services/workflow_users/extract_data_service.js');

const DATA_TO_EXTRACT = {
  filter_by_tag: {
    type: 'string',
    description: 'The tag that the user want to filter the products or empty not applicable',
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
  add_to_cart_by_product_code: {
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
- tags: funny, sarcastic, dark humor

**Actions**
In case the user wants to see more products, respond with #search.
In case the user wants to see the cart, respond with #see_cart.

Write #show-products to attach the products images on the message. The message can show up to 3 products.
"""
`

const AGENT_SLUG = 'ecommerce-search';
module.exports = {
  run: async function searchAgent(workflowUser) {
    workflowUser = await ExtractDataService(workflowUser, DATA_TO_EXTRACT);
    if (workflowUser.answers_data.details_for_product_code) { 
      return AgentRuns().insert({
        agent_slug: AGENT_SLUG,
        workflow_user_id: workflowUser.id,
        workflow_user_status: workflowUser.status,
        next_status: 'product_detail',
        is_complete: true
      });
    }
    
    if (workflowUser.answers_data.see_cart) { 
      return AgentRuns().insert({
        agent_slug: AGENT_SLUG,
        workflow_user_id: workflowUser.id,
        workflow_user_status: workflowUser.status,
        next_status: 'cart',
        is_complete: true
      });
    }
    
    const products = Products().where('client_id', workflowUser.client_id).limit(3)
    if (workflowUser.answers_data.filter_by_tag) {
      products.where('metadata:tags', 'array-contains', workflowUser.answers_data.filter_by_tag);
    }
    
    let offset = workflowUser.answers_data.offset || 0;
    if (workflowUser.answers_data.show_more_products) {
      offset += 3;
      products.offset(offset);
    }
    workflowUser.addAnswerData({ offset })

    if (workflowUser.answers_data.add_to_cart_by_product_code) {
      addCart({
        user_id: workflowUser.user_id,
        client_id: workflowUser.client_id,
        product_code: workflowUser.answers_data.add_to_cart_by_product_code,
        quantity: 1,
      })
    } 
    
    const prompt_with_products = `
    ${PROMPT}
    
    Products ready to show based on the filters:
    Filters: ${workflowUser.answers_data.filter_by_tag ? JSON.stringify(workflowUser.answers_data.filter_by_tag) : 'no filter'}
    Products: ${JSON.stringify(products)}
    `

    const client = await Clients().findOne('id', workflowUser.client_id);
    const agentRunParams = await threadRun(
      workflowUser.openai_thread_id,
      client.openai_assistant_id,
      prompt_with_products
    );

    if (agentRunParams.actions.list?.includes('#search')) {
      agentRunParams.is_complete = true
      agentRunParams.next_status = 'search'
    } else if (agentRunParams.actions.list?.includes('#see_cart')) {
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
