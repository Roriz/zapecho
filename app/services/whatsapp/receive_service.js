const { Client } = require('knex');
const User = require('../../models/user.js');
const Message = require('../../models/message.js');
const WorkflowUser = require('../../models/workflow_user.js');
const Channel = require('../../models/channel.js');
const fileStorageCreateService = require('../file_storages/create_service.js');
const { downloadMedia } = require('../../repositories/whatsapp_repository.js');
const runWorkflowService = require('../workflows/run_workflow_service.js');

const findChannel = (phoneId) => Channel().findOne('external_id', phoneId);

const findOrInsertUser = async (params) => {
  const user = await User().findOne('identifier', params.wa_id);

  if (user) { return user; }

  return User().insert({
    identifier: params.wa_id,
    name: params.profile.name,
  });
};

const insertMessage = (params, user, channel) => Message().insert({
  channel_id: channel.id,
  user_id: user.id,
  body: params.text?.body,
  message_type: params.type,
  whatsapp_id: params.id,
  whatsapp_created_at: new Date(params.timestamp * 1000),
  user_read_at: params.read_at,
});

const HAS_ATTACHMENT = ['image', 'sticker', 'video', 'audio', 'document'];
const attachMedia = async (messageParams, message) => {
  if (!HAS_ATTACHMENT.includes(messageParams.type)) { return; }

  const mediaId = messageParams[messageParams.type].id;
  const fileStorageParams = await downloadMedia(mediaId);

  await fileStorageCreateService({
    category: messageParams.type,
    ...fileStorageParams,
  }, 'message', message.id);
};

const clientByWorkflowUser = async (user) => {
  const workflowUser = await WorkflowUser().findOne({ user_id: user.id, final_step_at: null });

  return workflowUser?.client_id;
};

const clientByFindableMessage = async (message) => {
  const client = await Client().findOne('findable_message', message.body);

  return client?.id;
};

const discoverTheClient = async (message, user, channel) => {
  const clientId = channel.client_id || await clientByWorkflowUser(user) || await clientByFindableMessage(message);

  if (!clientId) { return null; }

  return clientId;
};

const discoverOrActivateWorkflowUser = async (user, clientId) => {
  const workflowUser = await WorkflowUser().findOne({ user_id: user.id, final_step_at: null });

  if (workflowUser) { return workflowUser; }

  if (clientId) {
    const client = await Client().findOne('id', clientId);

    return WorkflowUser().insert({
      user_id: user.id,
      workflow_id: client.first_workflow_id,
      client_id: clientId,
    });
  }

  return WorkflowUser().insert({
    user_id: user.id,
    workflow_id: await Workflow.query().findOne({ slug: 'router-client' }).select('id'),
    client_id: clientId,
  });
};

module.exports = async function whatsappReceiveService(params) {
  const channel = await findChannel(params.metadata.phone_number_id);
  if (!channel) { throw new Error('Channel not found'); }

  const user = await findOrInsertUser(params.contacts[0]);

  const message = await insertMessage(params.messages[0], user, channel);
  await attachMedia(params.messages[0], message);

  const clientId = await discoverTheClient(message, user, channel);
  const workflowUser = await discoverOrActivateWorkflowUser(message, user, clientId);

  await Message().where('id', message.id).update({
    client_id: clientId,
    workflow_user_id: workflowUser?.id,
  });

  if (workflowUser) {
    runWorkflowService(workflowUser);
  }

  return message;
};
