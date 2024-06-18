const { functionCall } = require('./openai_repository');

const PROMPT = "Given the user's latest messages, determine the next best action for the user make a conversion in a ecommerce."
const FUNCTION = {
  name: 'next_best_action',
  description: 'Determines the next best action for the user.',
  parameters: {
    type: 'object',
    properties: {
      next_best_action: {
        type: 'string',
        description: 'The next best action to move the user to.',
      }
    }
  }
}

module.nextAction = async function nextAction(lastRelevantMessages, statuses) {
  if (statuses.count === 1) { return statuses[0]; }

  const messagesToLLM = lastRelevantMessages.map(m => `${m.sender_type}: \`\`\`${m.body}\`\`\``)
  const llmMessages = [
    { role: 'assistant', content: PROMPT },
    { role: 'user', content: `lastest messages: """${messagesToLLM.join('\n\n')}"""`}
  ]
  const functionToCall = { ...FUNCTION } 
  functionToCall.parameters.next_best_action.enum = statuses

  const response = await functionCall(llmMessages, functionToCall)

  return response.next_status;
}
