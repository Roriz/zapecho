const Clients = require('~/models/client.js');
const Workflows = require('~/models/workflow.js');
const { openaiSDK } = require('~/repositories/openai_repository.js');

async function ClientsUpsertService(clientParams) {
  const client = await Clients().findOne({ name: clientParams.name });

  if (client) {
    return await Clients().updateOne(client, {
      findable_message: clientParams.findable_message,
      first_workflow_id: clientParams.first_workflow_id,
    });
  }
  
  return await Clients().insert({
    name: clientParams.name,
    findable_message: clientParams.findable_message,
    first_workflow_id: clientParams.first_workflow_id,
  });
}

module.exports = { ClientsUpsertService };
