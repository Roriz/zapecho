const WORKFLOW_TO_RUNNER = {
  'router-client': () => require('../../workflows/router_client_workflow.js'),
  'ecommerce-demo': () => require('../../workflows/ecommerce_demo_workflow.js'),
}

module.exports = async function runWorkflow(workflowUser) {
  const workflow = await Workflow().findOne('id', workflowUser.workflow_id);

  const runner = WORKFLOW_TO_RUNNER[workflow.slug];
  if (!runner) { throw new Error(`Workflow runner not found for workflow ${workflow.slug}`); }

  const runnerWorkflowUser = runner()(workflowUser);
  if (runnerWorkflowUser.id !== workflowUser.id) {
    runWorkflow(runnerWorkflowUser)
  }
};
