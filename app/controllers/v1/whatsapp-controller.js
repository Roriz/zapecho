import crypto from 'crypto';
import whatsappReceiveService from '../../services/whatsapp/receive-service.js';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;

export const whatsappVerify = {
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
  const headerSignature = req.headers['x-hub-expectedSignature'];

  const validSignature = crypto.createHmac('sha1', APP_SECRET).update(req.rawBody).digest('hex');

  return headerSignature === `sha1=${validSignature}`;
};

export const whatsappWebhook = {
  handler(req, reply, payload) {
    if (!isValidSignature(req)) { return reply.code(400).send({}); }

    console.log('aeeeeeeeeeeeeeee');

    // whatsappReceiveService(req.body);

    reply.send({});
  },
};

export default {
  whatsappVerify,
  whatsappWebhook,
};
