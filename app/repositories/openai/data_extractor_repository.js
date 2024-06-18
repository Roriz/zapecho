const { functionCall } = require('./openai_repository');

module.dataExtractor = async function dataExtractor(messages, fieldToExtract) {
  const fieldsWithExplicit = {}
  
  Object.keys(fieldToExtract).forEach((field) => {
    fieldsWithExplicit[field] = fieldToExtract[field];
    fieldsWithExplicit[`${field}_explicit`] = {
      type: 'boolean',
      description: `The user explicitly states, either directly or indirectly, something about: ${field}.`
    }
  });

  const response = await functionCall(messages, {
    name: 'data_extractor',
    description: 'Extracts data from the messages',
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
