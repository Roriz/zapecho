const { completionCall } = require('~/repositories/openai_repository');

const SENDER_TYPE_TO_ROLE = {
  'user': 'user',
  'agent': 'assistant',	
}
const INVALID_VALUES = [
 'not sure',
 'not clear',
 'not specified',
 'none',
 'null',
 'undefined',
]

module.exports = {
  dataExtractor: async function dataExtractor(lastRelevantMessages, fieldToExtract) {
    const fieldsWithExplanation = {}
    
    Object.keys(fieldToExtract).forEach((field) => {
      fieldsWithExplanation[`${field}_chain_of_thought`] = {
        type: 'text',
        description: `The user's chain of thought that led to the conclusion about: ${field}.`
      }
      fieldsWithExplanation[field] = fieldToExtract[field];
    });

    const messages = [
      {
        role: 'system',
        content: `
        Act as a data extractor function, that will extract structured and typed data from the user messages.
        You reponse a valid json based on the data schema:
        ${JSON.stringify(fieldsWithExplanation, null, 2)}
        `
      },
      ...lastRelevantMessages.map(m => {
        const role = SENDER_TYPE_TO_ROLE[m.sender_type]

        if (!role) return

        return {
          role: SENDER_TYPE_TO_ROLE[m.sender_type],
          content: m.body
        }
      }).filter(m => m)
    ]

    const response = await completionCall(messages);

    const cleanedResponse = {}
    Object.keys(response).forEach((field) => {
      if (field.endsWith('_chain_of_thought')) { return; }
      if (!response[field] || !response[`${field}_chain_of_thought`]) { return }
      
      if (INVALID_VALUES.includes(response[field])) { return }

      cleanedResponse[field] = response[field];
    });

    return cleanedResponse;
  }
}
