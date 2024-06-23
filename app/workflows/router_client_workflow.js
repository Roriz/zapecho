const Clients = require('~/models/client.js');
const WorkflowUsers = require('~/models/workflow_user.js');

module.exports = async function routerClientRunner(workflowUser) {
  // TODO: Implement the router client runner
  const client = await Clients().first()
  
  WorkflowUsers().where('id', workflowUser.id).update({
    finished_at: new Date(),
    current_step: 'finished'
  });

  return WorkflowUsers().insert({
    user_id: workflowUser.user_id,
    client_id: client.id,
    workflow_id: client.first_workflow_id,
  });
}
