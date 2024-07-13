const Messages = require('~/models/message.js');
const Products = require('~/models/product.js');

const { createAttachmentService } = require('~/services/storage/create_attachment_service.js');

const PROMPT = `
act as sales representative and welcome the user and introduce the company. Be responsive and helpful.
Your goal is to make the user be interested in any product or make a search, but don't be too pushy.

**Attachs**
If you thinking is fit for the message, you can attach stuff on the message. Available attachments:
#product_of_the_day: Attach image and small description of a product of the day at the end of the message.

**Actions**
In case the user shows interest in products or make a search, respond with #search.
`
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

class EcommerceIntroductionAgent extends BaseAgent {
  async run() {
    const lastMessage = await Messages().where('workflow_user_id', this.workflowUser.id).orderBy('created_at', 'desc').first();

    if (lastMessage.body === this.client.findable_message) {
      return this.createAgentRun({
        message_body: this.assistant.first_message,
        is_complete: false
      });
    }

    await this.extractData(DATA_TO_EXTRACT);

    if (this.answerData.user_has_tried_to_search) { return this.goToStatus('search'); }
    if (this.answerData.see_a_product_or_like_to_see_the_products) { return this.goToStatus('product-detail'); }

    await this.threadRun(PROMPT)

    if (this.agentRunParams.actions.list?.includes('#search')) {
      return this.deleteRunAndGoToStatus('search');
    }
    
    const agentRun = await this.createAgentRun(this.agentRunParams);

    if (this.agentRunParams.actions.list?.includes('#product_of_the_day')) {
      const product_of_the_day = await this.#getProductOfTheDay();      

      await createAttachmentService({
        category: 'media',
        storable_type: 'agent_run',
        storable_id: agentRun.id,
        storage_blob_id: (await product_of_the_day.photoAttachment()).storage_blob_id
      })
    }

    return agentRun;
  }

  #getProductOfTheDay() {
    return Products().where('client_id', this.client.id).orderBy('created_at', 'desc').first()
  }
}

module.exports = { EcommerceIntroductionAgent }
