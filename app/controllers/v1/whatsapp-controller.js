const crypto = require('crypto');
const envParams = require('#/configs/env_params.js');
const whatsappReceiveService = require('~/services/whatsapp/receive_service.js');

const whatsappVerify = {
  handler(req, reply) {
    if (
      req.query['hub.mode'] === 'subscribe'
      && req.query['hub.verify_token'] === envParams().whatsapp_verify_token
    ) {
      reply.send(req.query['hub.challenge']);
    } else {
      reply.code(403).send({});
    }
  },
};

const isValidSignature = (req) => {
  const headerSignature = req.headers['x-hub-signature'];

  const validSignature = crypto.createHmac(
    'sha1',
    envParams().whatsapp_app_secret
  ).update(req.rawBody).digest('hex');

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
