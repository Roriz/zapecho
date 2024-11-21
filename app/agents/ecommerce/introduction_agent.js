const Messages = require('~/models/message.js');

const { BaseAgent } = require('~/agents/base_agent.js');

class EcommerceIntroductionAgent extends BaseAgent {
  async run() {
    const lastMessage = await Messages().where('thread_id', this.workflowUser.id).orderBy('created_at', 'desc').first();

    const client = await this.client();
    const assistant = await this.assistant();
    if (lastMessage?.body === client.findable_message) {
      return this.createAgentRun({
        message_body: assistant.first_message,
        is_complete: false
      });
    }
    return this.goToStatus('search');
  }
}

module.exports = { EcommerceIntroductionAgent }
