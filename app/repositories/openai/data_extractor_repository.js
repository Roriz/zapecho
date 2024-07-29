const { completionCall } = require('~/repositories/openai_repository');

const SENDER_TYPE_TO_ROLE = {
  'user': 'user',
  'agent': 'assistant',	
}

module.exports = {
  dataExtractor: async function dataExtractor(lastRelevantMessages, fieldToExtract) {
    const fieldsWithExplicit = fieldToExtract
    
    Object.keys(fieldToExtract).forEach((field) => {
      if (fieldToExtract[field].type === 'boolean') { return; }

      fieldsWithExplicit[`${field}_explicit`] = {
        type: 'boolean',
        description: `The user explicitly states, either directly or indirectly, something about: ${field}.`
      }
    });

    const messages = [
      {
        role: 'system',
        content: `
        Act as a data extractor function, that will extract structured and typed data from the user messages.
        You reponse a valid json based on the data schema:
        ${JSON.stringify(fieldsWithExplicit, null, 2)}
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
      if (field.endsWith('_explicit')) { return; }
      if (!response[field] || !response[`${field}_explicit`]) { return }

      cleanedResponse[field] = response[field];
    });

    return cleanedResponse;
  }
}
