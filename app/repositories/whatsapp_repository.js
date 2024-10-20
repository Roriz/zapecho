const axios = require('axios');
const Users = require('~/models/user.js');
const envParams = require('#/configs/env_params.js');
const StorageAttachments = require('~/models/storage_attachment.js');
const StorageBlobs = require('~/models/storage_blob.js');

const WHATSAPP_PHONE_NUMBER_ID = '316864934845721';
const PERMANENT_TOKEN = envParams().whatsapp_permanent_token;
const WHATSAPP_URL = 'https://graph.facebook.com/v20.0';
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${PERMANENT_TOKEN}`,
};

const whatsappPostMessage = async (message) => {
  const user = await Users().findOne('id', message.user_id);

  const params = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: user.identifier,
    type: message.message_type,
  }

  if (message.message_type === 'text') {
    params.text = {
      body: `*${message.header}*
${message.body}

-------
\`${message.footer}\``,
    };
  } else if (message.message_type === 'image') {
    const messageAttachment = await StorageAttachments().where({
      storable_type: 'message',
      storable_id: message.id,
    }).first();
    const storageBlob = await StorageBlobs().findOne({ id: messageAttachment.storage_blob_id });

    const media = await uploadMedia(storageBlob);
    params.image = { id: media.id };
  } else if (message.message_type === 'template') {
    params.template = {
      name: message.template_name,
      language: { code: message.template_locale },
    };
  }

  const response = await axios.post(
    `${WHATSAPP_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    params,
    { headers: DEFAULT_HEADERS },
  );
  return response.data;
};

const uploadMedia = async (storageBlob) => {
  // TODO: create a cache table for save the media id
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');

  const blob = new Blob([storageBlob.getBlob()], { type: storageBlob.mimetype });
  form.append('file', blob, storageBlob.name);

  const response = await axios.post(
    `${WHATSAPP_URL}/${WHATSAPP_PHONE_NUMBER_ID}/media`,
    form,
    { 
      headers: {
        Authorization: `Bearer ${PERMANENT_TOKEN}`,
        'Content-Type': 'multipart/form-data'
      }
    }
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
    name: mediaResponse.headers['content-disposition'].split('filename=')[1],
    mimetype: mediaResponse.headers['content-type'],
    size: mediaResponse.headers['content-length'],
    extension: mediaResponse.headers['content-type'].split('/')[1],
    buffer: mediaResponse.data,
  };
};

module.exports = { whatsappPostMessage, downloadMedia };
