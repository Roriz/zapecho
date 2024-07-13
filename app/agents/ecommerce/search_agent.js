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
- "tags" with the enum: [funny, sarcastic, dark humor]

**Actions**
In case the user wants to see more products, respond with #search.
In case the user wants to see the cart, respond with #see_cart.
In case you want to show the products, respond with #show_products.
`

class EcommerceSearchAgent extends BaseAgent {
  async run() {
    await this.extractData(DATA_TO_EXTRACT);

    if (this.answerData.details_for_product_code) { return this.goToStatus('product_detail'); }
    if (this.answerData.see_cart) { return this.goToStatus('cart'); }

    if (this.answerData.add_to_cart_by_product_code) {
      this.#addCart();
    }
    
    const products = this.#getProducts();
    await this.threadRun(this.#mountPrompt(products));

    if (this.agentRunParams.actions.list?.includes('#see_cart')) {
      return this.deleteRunAndGoToStatus('cart');
    }

    const agentRun = await this.createAgentRun(this.agentRunParams);
    if (this.agentRunParams.actions.list?.includes('#show_products')) {
      await Promise.all(products.map(async product => createAttachmentService({
        category: 'media',
        storable_type: 'agent_run',
        storable_id: agentRun.id,
        storage_blob_id: (await product.photoAttachment()).storage_blob_id
      })))
    }

    return agentRun;
  }

  #addCart() {
    return addCart({
      user_id: this.workflowUser.user_id,
      client_id: this.workflowUser.client_id,
      product_code: this.answerData.add_to_cart_by_product_code,
      quantity: 1,
    })
  }

  #mountPrompt(products) {
    return `
    ${PROMPT}
    
    Products ready to show based on the filters:
    Filters: ${this.answerData.filter_by_tag ? JSON.stringify(this.answerData.filter_by_tag) : 'no filter'}
    Products: ${JSON.stringify(products)}
    `
  }

  async #getProducts() {
    const products = Products().where('client_id', this.workflowUser.client_id).limit(3)
    if (this.answerData.filter_by_tag) {
      products.where('metadata:tags', 'array-contains', this.answerData.filter_by_tag);
    }
    
    let offset = this.answerData.offset || 0;
    if (this.answerData.show_more_products) {
      offset += 3;
      products.offset(offset);
    }
    workflowUser.addAnswerData({ offset })

    return products;
  }
}

module.exports = { EcommerceSearchAgent }
