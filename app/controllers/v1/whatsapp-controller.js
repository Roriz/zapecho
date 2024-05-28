import whatsappReceiveService from "../../services/whatsapp/receive-service.js"

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN
const APP_SECRET = process.env.WHATSAPP_APP_SECRET

export const verify = {
  handler: async function (req, reply) {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
      reply.send(req.query['hub.challenge'])
    } else {
      reply.code(403).send({})
    }
  }
}

const is_valid_signature = (req) => {
  const signature = req.headers['x-hub-signature']
  
  if (!signature) { return false }

  const [_, signatureHash] = signature.split('=')
  
  const expectedHash = crypto.createHmac('sha1', APP_SECRET).update(JSON.stringify(req.body)).digest('hex')

  return signatureHash !== expectedHash
}

export const webhook = {
  handler: async function (req, reply) {
    if (is_valid_signature(req)) { return reply.code(400).send({}) }

    whatsappReceiveService()

    reply.send({})
  }
}

export default {
  verify,
  webhook
}
