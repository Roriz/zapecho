const Messages = require('~/models/message.js');
const Clients = require('~/models/client.js');
const { dataExtractor } = require('~/repositories/openai/data_extractor_repository.js');

module.exports = async function extract_data_service(workflowUser, data_to_extract) {
  let lastRelevantMessages = await Messages().lastRelevantMessages(workflowUser.id);
  const client = await Clients().findOne('id', workflowUser.client_id);
  lastRelevantMessages = lastRelevantMessages.filter((message) => message.body !== client.findable_message);
  
  console.debug('[services/workflow_users/extract_data_service] lastRelevantMessages', lastRelevantMessages.map((message) => message.body));
  console.debug('[services/workflow_users/extract_data_service] data_to_extract', data_to_extract);
  const extractedData = await dataExtractor(lastRelevantMessages, data_to_extract);

  if (extractedData) {
    return workflowUser.addAnswerData(extractedData)
  } else {
    return workflowUser
  }
}
