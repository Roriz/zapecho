require('../lib/relative_absolute.js');

const WorkflowUsers = require('~/models/workflow_user.js');
const run_service = require('~/services/workflows/run_service.js');
const envParams = require('#/configs/env_params.js');

(async () => {
  console.info('Reruning failed workflows...');

  const workflow_users = await WorkflowUsers().whereNotNull('last_runned_failed_at');
  for (const workflow_user of workflow_users) {
    console.info(`Reruning workflow_user.id:${workflow_user.id}...`);
    await run_service(workflow_user.id);
  }
  
  console.info('workflows runned.');
  process.exit(0);
})()
