const Messages = require('~/models/message.js');
const WorkflowUser = require('~/models/workflow_user.js');
const { dataExtractor } = require('~/repositories/openai/data_extractor_repository.js');

module.exports = async function extract_data_service(workflowUser, data_to_extract) {
  const lastRelevantMessages = await Messages().lastRelevantMessages(workflowUser.id);
  const extractedData = await dataExtractor(lastRelevantMessages, data_to_extract);

  if (extractedData) {
    return workflowUser.addAnswerData(extractedData)
  } else {
    return workflowUser
  }
}
