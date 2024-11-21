const Messages = require('~/models/message.js');
const Clients = require('~/models/client.js');
const { dataExtractor } = require('~/repositories/openai/data_extractor_repository.js');

const DATA_TO_EXTRACT = {
  message_is_a_litote: {
    type: 'boolean',
    description: `Return true if the message is a litote. A litote is a figure of speech that uses understatement to emphasize a point by stating a negative to further affirm a positive, often incorporating double negatives for effect.`
  },
  message_litote_true_meaning: {
    type: 'text',
    description: `The true meaning of the litote. Rephrase the message to a positive statement.`
  },
  // TODO: create a blocklist of topics
}

module.exports = async function extract_data_service(workflowUser, data_to_extract) {
  let lastRelevantMessages = await Messages().lastRelevantMessages(workflowUser.id);
  const client = await Clients().findOne('id', workflowUser.client_id);
  lastRelevantMessages = lastRelevantMessages.filter((message) => message.body !== client.findable_message);
  
  let extractedData = await dataExtractor(lastRelevantMessages, {
    ...data_to_extract,
    ...DATA_TO_EXTRACT,
  });

  if (extractedData && extractedData.message_is_a_litote) {
    lastRelevantMessages[lastRelevantMessages.length - 1] = {
      ...lastRelevantMessages[lastRelevantMessages.length - 1],
      body: extractedData.message_litote_true_meaning
    };

    extractedData = await dataExtractor(lastRelevantMessages, {
      ...data_to_extract,
      ...DATA_TO_EXTRACT,
    });
  }
  console.debug('[extract_data_service] extractedData', JSON.stringify(extractedData, null, 2));

  delete extractedData.message_is_a_litote;
  delete extractedData.message_litote_true_meaning;

  return extractedData;
}
