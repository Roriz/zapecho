const WORKFLOW_TO_RUNNER = {
  'router-client': () => require('./runners/router_client_runner.js'),
  'ecommerce-demo': () => require('./runners/ecommerce_demo_runner.js'),
}

module.exports = async function runWorkflow(workflowUser) {
  const workflow = await Workflow().findOne('id', workflowUser.workflow_id);

  const runner = WORKFLOW_TO_RUNNER[workflow.slug];
  if (!runner) { throw new Error(`Workflow runner not found for workflow ${workflow.slug}`); }

  return runner()(workflowUser);
};
