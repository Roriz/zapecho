const { functionCall } = require('~/repositories/openai_repository');

const SENDER_TYPE_TO_ROLE = {
  'user': 'user',
  'client': 'client',
  'agent': 'customer_support',	
}

module.exports = {
  dataExtractor: async function dataExtractor(lastRelevantMessages, fieldToExtract) {
    const fieldsWithExplicit = {}
    
    Object.keys(fieldToExtract).forEach((field) => {
      fieldsWithExplicit[field] = fieldToExtract[field];
      fieldsWithExplicit[`${field}_explicit`] = {
        type: 'boolean',
        description: `The user explicitly states, either directly or indirectly, something about: ${field}.`
      }
    });

    const messages = [
      {
        role: 'assistant',
        content: `
        Act as a information extractor and extract strcutured and typed data from the user messages.
        You should extract the following fields:
        ${Object.keys(fieldToExtract).map(f => `- ${f}: ${fieldToExtract[f].description}`).join('\n')}
        `
      },
      {
        role: 'user',
        content: `
        Here are the last relevant messages:
        ${lastRelevantMessages.filter(m => m.body).map(m => `${SENDER_TYPE_TO_ROLE[m.sender_type]}: """${m.body}"""`)}
        `
      }
    ]

    const response = await functionCall(messages, {
      name: 'information_extractor',
      description: 'extracting structured and typed data from user messages.',
      parameters: {
        type: 'object',
        properties: fieldsWithExplicit
      }
    });

    const cleanedResponse = {}
    Object.keys(response).forEach((field) => {
      if (field.endsWith('_explicit')) { return; }
      if (!response[field] || !response[`${field}_explicit`]) { return }

      cleanedResponse[field] = response[field];
    });

    return cleanedResponse;
  }
}
