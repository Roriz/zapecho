const Channels = require('../app/models/channel.js');

(async () => {
  console.info('Inserting channels...');
  await Channels().insert({
    type: 'whatsapp',
    external_id: '316864934845721',
    client_id: null,
  });

  console.info('Channels inserted.');
  process.exit(0);
})()
