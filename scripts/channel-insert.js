const Channel = require('../app/models/channel.js');

console.info('Inserting channels...');
Channel.insertMany([
  {
    type: 'whatsapp',
    external_id: '316864934845721',
    client_id: null,
  },
]);
console.info('Channels inserted.');
