const DATA_TO_EXTRACT = {
  add_to_cart_by_product_code: {
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

class EcommerceProductDetailAgent extends BaseAgent {
  async run() {
    await this.extractData(DATA_TO_EXTRACT);

    if (this.answerData.user_wants_to_see_other_products) { return this.goToStatus('search'); }

    if (this.answerData.add_to_cart_by_product_code) {
      this.#addCart();
    }
    
    await this.threadRun(PROMPT);


    return this.createAgentRun(this.agentRunParams);
  }

  #addCart() {
    return addCart({
      user_id: this.workflowUser.user_id,
      client_id: this.workflowUser.client_id,
      product_code: this.answerData.add_to_cart_by_product_code,
      quantity: 1,
    })
  }
}

module.exports = { EcommerceProductDetailAgent }
