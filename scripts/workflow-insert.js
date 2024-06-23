const Workflows = require('../app/models/workflow.js');

(async () => {
  console.info('Inserting workflows...');
  await Promise.all([
    Workflows().insert({
      slug: 'router-client',
      description: 'Router client workflow. This is the first workflow that the client will see to discover which client they need.',
      first_message: 'Welcome to Zapecho! I do not find your client, please tell me the name of your client or what you need and I will transfer you to the client assistant.',
    }),
    Workflows().insert({
      slug: 'ecommerce-demo',
      description: 'Demo of an ecommerce workflow.',
      first_message: 'Welcome to the <%= clientName %>! How can I help you today?',
    }),
  ]);
  console.info('Workflows inserted.');
  process.exit(0);
})()

