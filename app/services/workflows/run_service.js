const knex = require('knex');
const Workflows = require('~/models/workflow.js');
const WorkflowUsers = require('~/models/workflow_user.js');

const WORKFLOW_TO_RUNNER = {
  'router-client': () => require('~/workflows/router_client_workflow.js'),
  'ecommerce-demo': () => require('~/workflows/ecommerce_demo_workflow.js'),
}

async function runWorkflow(workflowUser) {
  const workflow = await Workflows().findOne('id', workflowUser.workflow_id);

  if (workflowUser.is_running) { console.warn(`Workflow ${workflow.slug} is already running`); return; }

  const runner = WORKFLOW_TO_RUNNER[workflow.slug];
  if (!runner) { throw new Error(`Workflow runner not found for workflow ${workflow.slug}`); }

  await WorkflowUsers().updateOne(workflowUser, {
    is_running: true,
    last_runned_failed_at: null,
  });

  try {
    knex.transaction(async () => {
      const runnerWorkflowUser = await runner()(workflowUser);

      await WorkflowUsers().updateOne(workflowUser, {
        is_running: false,
        last_runned_finished_at: new Date(),
      });

      if (runnerWorkflowUser.id !== workflowUser.id) {
        await runWorkflow(runnerWorkflowUser)
      }
    })
  } catch (error) {
    await WorkflowUsers().updateOne(workflowUser, {
      is_running: false,
      last_runned_failed_at: new Date(),
    });
  }
};

module.exports = runWorkflow
