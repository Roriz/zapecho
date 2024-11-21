const Clients = require('~/models/client.js');
const Users = require('~/models/user.js');
const Messages = require('~/models/message.js');
const WorkflowUsers = require('~/models/workflow_user.js');
const Channels = require('~/models/channel.js');
const { createAttachmentService } = require('~/services/storage/create_attachment_service.js');
const { downloadMedia } = require('~/repositories/whatsapp_repository.js');
const workflowRunService = require('~/services/workflows/run_service.js');
const Workflows = require('~/models/workflow.js');

const _findChannel = (phoneId) => Channels().findOne('external_id', phoneId);

const _findOrInsertUser = async (params) => {
  const user = await Users().findOne('identifier', params.wa_id);

  if (user) { return user; }

  return Users().insert({
    identifier: params.wa_id,
    name: params.profile.name,
  });
};

const HAS_ATTACHMENT = ['image', 'sticker', 'video', 'audio', 'document'];
const _attachMedia = async (messageParams, messageId) => {
  if (!HAS_ATTACHMENT.includes(messageParams.type)) { return; }

  const mediaId = messageParams[messageParams.type].id;
  const file = await downloadMedia(mediaId);

  await createAttachmentService({
    category: 'media',
    storable_type: 'message',
    storable_id: messageId,
    storage_blob: file
  });
};

const _insertMessage = async (params, user, channel) => { 
  const message = await Messages().insert({
    sender_type: 'user',
    channel_id: channel.id,
    user_id: user.id,
    body: params.text?.body,
    message_type: params.type,
    whatsapp_id: params.id,
    whatsapp_created_at: new Date(params.timestamp * 1000),
    user_read_at: params.read_at,
  });
  _attachMedia(params, message.id);

  return message;
};

const _clientByWorkflowUser = async (user) => {
  const workflowUser = await WorkflowUsers().findOne({ user_id: user.id, finished_at: null });

  return workflowUser?.client_id;
};

const _clientByFindableMessage = async (message) => {
  const client = await Clients().findOne('findable_message', message.body);
  
  return client?.id;
};

const _discoverTheClient = async (message, user, channel) => {
  return channel.client_id || await _clientByWorkflowUser(user) || await _clientByFindableMessage(message);
};

const _findOrActivateWorkflowUser = async (user, clientId) => {
  const workflowUser = await WorkflowUsers().findOne({ user_id: user.id, finished_at: null });

  if (workflowUser) { return workflowUser; }

  if (clientId) {
    const client = await Clients().findOne('id', clientId);

    return WorkflowUsers().insert({
      user_id: user.id,
      workflow_id: client.first_workflow_id,
      client_id: clientId,
    });
  }

  const routerWorkflow = await Workflows().findOne({ slug: 'router-client' })

  return WorkflowUsers().insert({
    user_id: user.id,
    workflow_id: routerWorkflow.id,
    client_id: null,
  });
};

async function _markMessagesAsRead(params) {
  const whatsappIds = params.statuses.map((status) => status.id);
  const readTimestamp = params.statuses[0].timestamp;

  return Messages().whereIn('whatsapp_id', whatsappIds).update({
    user_read_at: new Date(readTimestamp * 1000),
  });
}

module.exports = async function whatsappReceiveService(params) {
  if (params.statuses) {
    _markMessagesAsRead(params);
    return;
  }
  
  const channel = await _findChannel(params.metadata.phone_number_id);
  if (!channel) { throw new Error('Channel not found'); }
  
  const user = await _findOrInsertUser(params.contacts[0]);
  
  const message = await _insertMessage(params.messages[0], user, channel);

  const clientId = await _discoverTheClient(message, user, channel); // can be null
  const workflowUser = await _findOrActivateWorkflowUser(user, clientId);

  await Messages().where('id', message.id).update({
    workflow_user_id: workflowUser.id,
    client_id: clientId,
  });
  
  if (params.messages[0].text?.body == '/reset') {
    await WorkflowUsers().updateOne(workflowUser, { current_step: 'force_reset', finished_at: new Date() });
    return;
  }

  // INFO: run the workflow async
  // TODO: use a background job here
  new Promise(() => workflowRunService(workflowUser.id));

  return message;
};
