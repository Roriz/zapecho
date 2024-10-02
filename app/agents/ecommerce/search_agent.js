const Products = require('~/models/product.js');

const { BaseAgent } = require('~/agents/base_agent.js');
const { createAttachmentService } = require('~/services/storage/create_attachment_service.js');

const DATA_TO_EXTRACT = {
  details_for_product_code: {
    type: 'string',
    description: 'The product code that the user want to see the details or empty not applicable',
  },
  add_to_cart_by_product_name_or_code: {
    type: 'string',
    description: 'The product code that the user want to add to the cart or empty not applicable',
  },
  quantity_to_add_to_cart: {
    type: 'number',
    description: 'The quantity that the user want to add to the cart or empty not applicable',
  },
}

const PROMPT = `
You are a customer service agent assisting the user in finding the right product on our platform. Your role is to understand the user's preferences and convert them into appropriate filters to help them find the best product options.

## Instructions
1. *Engage with the User*
   - Start by greeting the user and asking open-ended questions to gather their preferences.
   - Listen actively and clarify any ambiguous responses to ensure you understand their needs.

2. *Apply Relevant Filters*
   - Based on the gathered preferences, determine the appropriate filters to use.
   - Use the filters to narrow down the product options.

3. *Use Available Functions*
   - Each message can have a function call to enhance the response.
   - Append the function call with brackets at the end of your message to execute it. (e.g., \`{{ search_products(tags: ["recommended"]) }}\`)

## Functions
- \`search_products(tags?: string[])\` - Search products based on tags and append the top 3 products from the search after your message. Tags are optional.

`

const DEFAULT_EXAMPLE_INTERACTION = `
## Example Interaction
assistant: Hi! Welcome to our platform. Can you tell me what kind of product you are looking for today?
user: I'm looking for a laptop for gaming.
assistant: Great! Do you have any specific preferences, like brand, budget, or features?
user: I'd prefer something from ASUS, under $1500, with a high-refresh-rate screen.
assistant: Perfect, let me find the best options for you. \nHere are the top 3 products that match your preferences: \n {{ search_products(tags: ["ASUS", "gaming", "high-refresh-rate", "under-1500"]) }}
`

class EcommerceSearchAgent extends BaseAgent {
  async run() {
    await this.extractData(DATA_TO_EXTRACT);

    if (this.answerData.add_to_cart_by_product_name_or_code) {
      await this.#addCart();
    }
    
    await this.threadRun(this.#mountPrompt());

    let agentRun = await this.createAgentRun(this.agentRunParams);
    if (agentRun.functions?.search_products) {
      const products = this.#searchAndAttachProducts(agentRun);

      if (products.length === 0) {
        const randomProduct = await Products().findOne({ client_id: this.workflowUser.client_id })
        agentRun.message_body = `\n\nInfelizmente não encontrei nenhum produto, pode ser o ${randomProduct.name}?`;
      }
    }

    return agentRun;
  }

  async #addCart() {
    this.workflowUser = await this.workflowUser.addAnswerData({ add_to_cart_by_product_name_or_code: undefined });
    const product = await this.find_product(this.answerData.add_to_cart_by_product_name_or_code)

    if (!product) { return }

    return this.addCart(product.id, 1);
  }

  async #searchAndAttachProducts(tags, agentRunId) {
    const products = await this.#getProducts(agentRun.functions.search_products.arguments.tags);

    if (!products.length) { return [] }

    // TODO: attach a image the product description on each image
    return Promise.all(products.map(async product => createAttachmentService({
      category: 'media',
      storable_type: 'agent_run',
      storable_id: agentRunId,
      storage_blob_id: (await product.photoAttachment()).storage_blob_id
    })))
  }

  #mountPrompt() {
    return `
    ${PROMPT}

    ## Context
    available tags: ["funny", "sarcastic", "dark humor"]

    ${DEFAULT_EXAMPLE_INTERACTION}
    `
  }

  async #getProducts(tags) {
    return Products().where({ client_id: this.workflowUser.client_id }).hasTags(tags).limit(3);
  }
}

module.exports = { EcommerceSearchAgent }
