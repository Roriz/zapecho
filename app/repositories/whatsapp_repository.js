const axios = require('axios');
const User = require('../../models/user.js');

const WHATSAPP_PHONE_NUMBER_ID = '316864934845721';
const PERMANENT_TOKEN = 'EAAErNEdwc78BOzSRHJ2Ot5B9SRhG7BZCGtycypX8aMJ8eA8jViR1i0TQOxWV6oZAIgELYwFmBJrwZCqXZAV94ZAw7ej7su2v1Kl91fZCKgbsqkJG1u7ZCovutf8E1cFqGESP6thZCy7zNyEfxyxEkU1aydvIoWRuJeBp32ZBti3PvKq6c2NeddjY5yQOmaa0Oxl6VG36NV7mYoYndF2rxgQRS';
const WHATSAPP_URL = 'https://graph.facebook.com/v20.0';
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${PERMANENT_TOKEN}`,
};

const sendWhatsappMessage = async (message) => {
  const user = await User().findOne('id', message.user_id);

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
