const Messages = require('~/models/message.js');
const Clients = require('~/models/client.js');
const { dataExtractor } = require('~/repositories/openai/data_extractor_repository.js');

module.exports = async function extract_data_service(workflowUser, data_to_extract) {
  let lastRelevantMessages = await Messages().lastRelevantMessages(workflowUser.id);
  const client = await Clients().findOne('id', workflowUser.client_id);
  lastRelevantMessages = lastRelevantMessages.filter((message) => message.body !== client.findable_message);
  
  const extractedData = await dataExtractor(lastRelevantMessages, data_to_extract);

  if (extractedData) {
    return workflowUser.addAnswerData(extractedData)
  } else {
    return workflowUser
  }
}
