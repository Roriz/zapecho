const Client = require('../../models/client.js');
const WorkflowUser = require('../../models/workflow_user.js');

module.exports = async function routerClientRunner(workflowUser) {
  // TODO: Implement the router client runner
  const client = await Client().first()
  
  WorkflowUser().where('id', workflowUser.id).update({
    finished_at: new Date(),
    current_step: 'finished'
  });

  return WorkflowUser().insert({
    user_id: workflowUser.user_id,
    client_id: client.id,
    workflow_id: client.first_workflow_id,
  });
}
