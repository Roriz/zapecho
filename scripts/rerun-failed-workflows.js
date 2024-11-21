require('../lib/relative_absolute.js');

const Threads = require('~/models/thread.js');
const run_service = require('~/services/workflows/run_service.js');
const envParams = require('#/configs/env_params.js');

(async () => {
  console.info('Reruning failed workflows...');

  const threads = await Threads().whereNotNull('last_runned_failed_at').where('finished_at', null)
  for (const thread of threads) {
    console.info(`Reruning thread.id:${thread.id}...`);
    await run_service(thread.id);
  }
  
  console.info('workflows runned.');
  process.exit(0);
})()
