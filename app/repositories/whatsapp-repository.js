import axios from 'axios';

const ACCOUNT_ID = '316864934845721'
const permanent_token = 'EAAErNEdwc78BOwnb80X2vEnZBlHDGGmnGtoty3YJu4Fu60denQTeCO0jnBjLl7NtDiSUTIY6r7Iefbujy1XfpYWfjhb5wmj351ZCfWE0bzKrNuGEYBfrRXPRI8K5ZAL4vxuxhgHsqW5ZClLcBThDphOHbozce5XwBx2ko83ZBA1ZCrDH001vru17KJdqR3pqG9Jre27iFZAjDbYjiUGXZBEZD'
const WHATSAPP_URL = `https://graph.facebook.com/v19.0/${ACCOUNT_ID}`
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${permanent_token}`,
}

// await sendWhatsappMessage({
//   user: { phoneNumber: '+5511953664050' },
//   messageType: 'template',
//   templateName: 'hello_world',
//   templateLocale: 'en_US',
// })
export const sendWhatsappMessage = async (message) => {
  const response = await axios.post(`${WHATSAPP_URL}/messages`, {
    messaging_product: 'whatsapp',
    to: message.user.phoneNumber,
    type: message.messageType,
    ...(message.messageType === 'text' && { text: { body: message.text } } ),
    ...(message.messageType === 'template' && {
      template: {
        name: message.templateName,
        language: { code: message.templateLocale }
      }
    }),
  }, {
    headers: DEFAULT_HEADERS,
  })
  return response
}
