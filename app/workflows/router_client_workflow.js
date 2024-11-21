const Clients = require('~/models/client.js');
const Threads = require('~/models/thread.js');

module.exports = async function routerClientRunner(workflowUser) {
  // TODO: Implement the router client runner
  const client = await Clients().first()
  
  await Threads().updateOne(workflowUser, {
    finished_at: new Date(),
    status: 'finished'
  });

  const workflowUserByClient = await Threads().insert({
    user_id: workflowUser.user_id,
    client_id: client.id,
    workflow_id: client.first_workflow_id,
  }); 

  return workflowUserByClient;
}
