const { BaseAgent } = require('~/agents/base_agent.js');

const DATA_TO_EXTRACT = {
  has_gone_too_pushy: {
    type: 'boolean',
    description: 'Assistant already made the last attempt, but the user did not show interest in products or make a search.'
  },
  assistant_already_says_goodbye: {
    type: 'boolean',
    description: 'Assistant already made the farewell message to the user.'
  },
}

const LAST_TRY_PROMPT = `
act as senior customer experience and make a last attempt to keep the user engaged. Be responsive and helpful.
your goal is discover what has gone wrong and try to solve the problem one last time. Don't be too pushy.

**Actions**
In case the user shows interest in products or make a search, respond with #search.
`

const FAREWELL_PROMPT = `
act as senior customer experience and make the farewell message to the user.
your goal is to make the user feel comfortable and welcome to come back later.
`

class EcommerceCancelledAgent extends BaseAgent {
  async run() {
    await this.extractData(DATA_TO_EXTRACT);

    if (this.answerData.assistant_already_says_goodbye) { return this.goToStatus(); }
    
    const prompt = this.answerData.has_gone_too_pushy ? FAREWELL_PROMPT : LAST_TRY_PROMPT
    await this.threadRun(prompt);

    if (this.agentRunParams.actions.list?.includes('#search')) {
      return this.deleteRunAndGoToStatus('cart');
    }

    return this.createAgentRun(this.agentRunParams);
  }
}

module.exports = { EcommerceCancelledAgent }
