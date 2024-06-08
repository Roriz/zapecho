const crypto = require('crypto');
const whatsappReceiveService = require('../../services/whatsapp/receive_service.js');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;

const whatsappVerify = {
  handler(req, reply) {
    if (
      req.query['hub.mode'] === 'subscribe'
      && req.query['hub.verify_token'] === VERIFY_TOKEN
    ) {
      reply.send(req.query['hub.challenge']);
    } else {
      reply.code(403).send({});
    }
  },
};

const isValidSignature = (req) => {
  const headerSignature = req.headers['x-hub-signature'];

  const validSignature = crypto.createHmac('sha1', APP_SECRET).update(req.rawBody).digest('hex');

  return headerSignature === `sha1=${validSignature}`;
};

const whatsappWebhook = {
  handler(req, reply) {
    if (!isValidSignature(req)) { return reply.code(400).send({}); }

    whatsappReceiveService(req.body.entry[0].changes[0].value);

    return reply.send({});
  },
};

module.exports = { whatsappVerify, whatsappWebhook };
module.whatsappVerify = whatsappVerify;
module.whatsappWebhook = whatsappWebhook;
