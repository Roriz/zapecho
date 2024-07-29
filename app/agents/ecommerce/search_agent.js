const Products = require('~/models/product.js');

const { BaseAgent } = require('~/agents/base_agent.js');
const { addCart } = require('~/services/carts/add_service.js');
const { createAttachmentService } = require('~/services/storage/create_attachment_service.js');

const DATA_TO_EXTRACT = {
  filter_by_tag: {
    type: 'string',
    description: 'The tag that the user want to filter the products or empty not applicable',
    enum: ['dark humor', 'funny', 'sarcastic'],
  },
  details_for_product_code: {
    type: 'string',
    description: 'The product code that the user want to see the details or empty not applicable',
  },
  add_to_cart_by_product_code: {
    type: 'string',
    description: 'The product code that the user want to add to the cart or empty not applicable',
  }
}

const SEARCH_PROMPT = `
act as customer service and help the user find the right product. You will be the bridge between the user and the plataform, talking to the user and convert to filters for the plataform.
Your goal is find the right product for the user, using the filters based on the user's preferences.

filter available:
- "tags" with the enum: [funny, sarcastic, dark humor]

**Actions**
append #show_products to show the products and attach the respective images.
`

const DETAIL_PROMPT = `
act as customer service and help the user understand the product.
Your goal is to show the product details to the user and help them to make a decision.

**Actions**
Append #photo to attach the product image to the message.
`

class EcommerceSearchAgent extends BaseAgent {
  async run() {
    await this.extractData(DATA_TO_EXTRACT);

    if (this.answerData.add_to_cart_by_product_code) {
      await this.#addCart();
    }
    
    const products = await this.#getProducts();
    await this.threadRun(this.#mountPrompt(products));

    const agentRun = await this.createAgentRun(this.agentRunParams);
    if (agentRun.actions.list?.includes('#show_products') || agentRun.actions.list?.includes('#photo')) {
      await Promise.all(products.map(async product => createAttachmentService({
        category: 'media',
        storable_type: 'agent_run',
        storable_id: agentRun.id,
        storage_blob_id: (await product.photoAttachment()).storage_blob_id
      })))
    }

    return agentRun;
  }

  async #addCart() {
    this.workflowUser = await this.workflowUser.addAnswerData({ add_to_cart_by_product_code: undefined });
    return addCart({
      user_id: this.workflowUser.user_id,
      client_id: this.workflowUser.client_id,
      product_code: this.answerData.add_to_cart_by_product_code,
      quantity: 1,
    })
  }

  #mountPrompt(products) {
    if (this.answerData.details_for_product_code) {
      return `
      ${DETAIL_PROMPT}

      The selected product is in json: \`\`\`json
      ${JSON.stringify(products[0])}
      \`\`\`
      `;
    }

    return `
    ${SEARCH_PROMPT}
    
    ${this.answerData.filter_by_tag ? `Filters: ${JSON.stringify(this.answerData.filter_by_tag)}` : ''}
    Products ready to show in json:
    \`\`\`json
    ${JSON.stringify(products)}
    \`\`\`
    `
  }

  async #getProducts() {
    if (this.answerData.filter_by_tag) {
      return Products().where({
        client_id: this.workflowUser.client_id 
      }).whereRaw(
        'metadata->>\'tags\' ilike ?',
        [`%"${this.answerData.filter_by_tag}"%`]
      ).limit(3);
    } else if (this.answerData.details_for_product_code) {
      return (await Products().where({
        client_id: this.workflowUser.client_id,
        code: this.answerData.details_for_product_code
      })) || (await Products().where({
        client_id: this.workflowUser.client_id,
        name: this.answerData.details_for_product_code
      }))
    }

    return Products().where('client_id', this.workflowUser.client_id).limit(3);
  }
}

module.exports = { EcommerceSearchAgent }
