const axios = require('axios');
const Users = require('~/models/user.js');

const WHATSAPP_PHONE_NUMBER_ID = '316864934845721';
const PERMANENT_TOKEN = 'EAAErNEdwc78BO7TedcFZCMZAI1MrL3FydP2tWrg07YsiBcNknDCGaYEu8InUrkw3IhEiOgsHTYGh30oMOZCgr3vbqFVvRZBMTmup6vZAGOZAEnn3OqcBIiVaNRpFdGOIam1MWMagZCGkW4MZB245wTFZBxNn2lMVOGwaFFiaqaJZCzG6Lp3UbOpMGypMEE9ZA2OVbiemWHVYIeAHkO8oVwszKMZD';
const WHATSAPP_URL = 'https://graph.facebook.com/v20.0';
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${PERMANENT_TOKEN}`,
};

const sendWhatsappMessage = async (message) => {
  const user = await Users().findOne('id', message.user_id);

  const response = await axios.post(
    `${WHATSAPP_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to: user.identifier,
      type: message.messageType,
      ...(message.messageType === 'text' && { text: { body: message.text } }),
      ...(message.messageType === 'template' && {
        template: {
          name: message.templateName,
          language: { code: message.templateLocale },
        },
      }),
    },
    { headers: DEFAULT_HEADERS },
  );
  return response.data;
};

const downloadMedia = async (mediaId) => {
  const response = await axios.get(
    `${WHATSAPP_URL}/${mediaId}`,
    { headers: DEFAULT_HEADERS },
  );

  const mediaResponse = await axios.get(
    response.data.url,
    { responseType: 'arraybuffer', headers: DEFAULT_HEADERS },
  );

  return {
    originalName: mediaResponse.headers['content-disposition'].split('filename=')[1],
    mimetype: mediaResponse.headers['content-type'],
    size: mediaResponse.headers['content-length'],
    extension: mediaResponse.headers['content-type'].split('/')[1],
    fileBuffer: mediaResponse.data,
  };
};

module.exports = { sendWhatsappMessage, downloadMedia };
