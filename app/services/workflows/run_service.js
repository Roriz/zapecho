const { db } = require('#/configs/database.js');

const Messages = require('~/models/message.js');
const Workflows = require('~/models/workflow.js');
const Threads = require('~/models/thread.js');

const WORKFLOW_TO_RUNNER = {
  'router-client': () => require('~/workflows/router_client_workflow.js'),
  'ecommerce-demo': () => require('~/workflows/ecommerce_demo_workflow.js'),
  'medical-secretary': () => require('~/workflows/medical_secretary_workflow.js'),
}

// HACK: migrate the messages from the previous workflow to the new one.
// Ideally, we should have messages with multiple thread_ids or duplicate the messages for each thread_id.
async function _migrateLatestMessages(oldThread, newThread) {
  const messages = await Messages().where('sender_type', 'user').lastRelevantMessages(oldThread.id, 1);

  return Promise.all(
    messages.map(message => Messages().updateOne(message, { thread_id: newThread.id }))
  );
}

module.exports = async function runWorkflow(threadId) {
  const thread = await Threads().findOne('id', threadId);
  const workflow = await Workflows().findOne('id', thread.workflow_id);

  if (thread.is_running) { console.warn(`Workflow ${workflow.slug} is already running`); return; }

  const runner = WORKFLOW_TO_RUNNER[workflow.slug];
  if (!runner) { throw new Error(`Workflow runner not found for workflow ${workflow.slug}`); }

  await Threads().updateOne(thread, {
    is_running: true,
    last_runned_failed_at: null,
  });

  try {
    await db().transaction(async () => {
      const runnerThread = await runner()(thread);

      await Threads().updateOne(thread, {
        is_running: false,
        last_runned_finished_at: new Date(),
      });

      if (runnerThread.id !== thread.id) {
        await _migrateLatestMessages(thread, runnerThread);
        await runWorkflow(runnerThread)
      }
    })
  } catch (error) {
    console.error({
      code: 'workflows/run_service',
      error,
      payload: JSON.stringify({ threadId, error })
    });
    await Threads().updateOne(thread, {
      is_running: false,
      last_runned_failed_at: new Date(),
    });
  }
};
