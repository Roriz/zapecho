require('../lib/relative_absolute.js');
const { db } = require('#/configs/database.js');
const Channels = require('~/models/channel.js');
const Workflows = require('~/models/workflow.js');

(async () => {
  console.info('Inserting seeds...');
  
  await db().transaction(async (trx) => {
    await Channels().insert({
      type: 'whatsapp',
      external_id: '316864934845721',
      client_id: null,
    });
    
    await Workflows().insert({
      slug: 'router-client',
      description: 'Router client workflow. This is the first workflow that the client will see to discover which client they need.',
      first_message: 'Welcome to Zapecho! I do not find your client, please tell me the name of your client or what you need and I will transfer you to the client assistant.',
    })
    await Workflows().insert({
      slug: 'ecommerce-demo',
      description: 'Demo of an ecommerce workflow.',
      first_message: 'Welcome to the <%= clientName %>! How can I help you today?',
    })
  });

  console.info('Seeds inserted.');
  process.exit(0);
})()
