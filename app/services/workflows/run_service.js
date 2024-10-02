const { db } = require('#/configs/database.js');

const Messages = require('~/models/message.js');
const Workflows = require('~/models/workflow.js');
const WorkflowUsers = require('~/models/workflow_user.js');

const WORKFLOW_TO_RUNNER = {
  'router-client': () => require('~/workflows/router_client_workflow.js'),
  'ecommerce-demo': () => require('~/workflows/ecommerce_demo_workflow.js'),
}

// HACK: migrate the messages from the previous workflow to the new one.
// Ideally, we should have messages with multiple workflow_user_ids or duplicate the messages for each workflow_user_id.
async function _migrateLatestMessages(oldWorkflowUser, newWorkflowUser) {
  const messages = await Messages().where('sender_type', 'user').lastRelevantMessages(oldWorkflowUser.id, 1);

  return Promise.all(
    messages.map(message => Messages().updateOne(message, { workflow_user_id: newWorkflowUser.id }))
  );
}

module.exports = async function runWorkflow(workflowUserId) {
  const workflowUser = await WorkflowUsers().findOne('id', workflowUserId);
  const workflow = await Workflows().findOne('id', workflowUser.workflow_id);

  if (workflowUser.is_running) { console.warn(`Workflow ${workflow.slug} is already running`); return; }

  const runner = WORKFLOW_TO_RUNNER[workflow.slug];
  if (!runner) { throw new Error(`Workflow runner not found for workflow ${workflow.slug}`); }

  await WorkflowUsers().updateOne(workflowUser, {
    is_running: true,
    last_runned_failed_at: null,
  });

  try {
    await db().transaction(async () => {
      const runnerWorkflowUser = await runner()(workflowUser);

      await WorkflowUsers().updateOne(workflowUser, {
        is_running: false,
        last_runned_finished_at: new Date(),
      });

      if (runnerWorkflowUser.id !== workflowUser.id) {
        await _migrateLatestMessages(workflowUser, runnerWorkflowUser);
        await runWorkflow(runnerWorkflowUser)
      }
    })
  } catch (error) {
    console.error({ code: 'workflows/run_service', payload: error });
    await WorkflowUsers().updateOne(workflowUser, {
      is_running: false,
      last_runned_failed_at: new Date(),
    });
  }
};
