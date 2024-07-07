const Clients = require('~/models/client.js');
const Users = require('~/models/user.js');
const Messages = require('~/models/message.js');
const WorkflowUsers = require('~/models/workflow_user.js');
const Channels = require('~/models/channel.js');
const { createAttachmentService } = require('~/services/storage/create_attachment_service.js');
const { downloadMedia } = require('~/repositories/whatsapp_repository.js');
const workflowRunService = require('~/services/workflows/run_service.js');
const Workflows = require('~/models/workflow.js');

const findChannel = (phoneId) => Channels().findOne('external_id', phoneId);

const findOrInsertUser = async (params) => {
  const user = await Users().findOne('identifier', params.wa_id);

  if (user) { return user; }

  return Users().insert({
    identifier: params.wa_id,
    name: params.profile.name,
  });
};

const HAS_ATTACHMENT = ['image', 'sticker', 'video', 'audio', 'document'];
const attachMedia = async (messageParams, messageId) => {
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

const insertMessage = async (params, user, channel) => { 
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
  attachMedia(params, message.id);

  return message;
};

const clientByWorkflowUser = async (user) => {
  const workflowUser = await WorkflowUsers().findOne({ user_id: user.id, finished_at: null });

  return workflowUser?.client_id;
};

const clientByFindableMessage = async (message) => {
  const client = await Clients().findOne('findable_message', message.body);

  return client?.id;
};

const discoverTheClient = async (message, user, channel) => {
  return channel.client_id || await clientByWorkflowUser(user) || await clientByFindableMessage(message);
};

const findOrActivateWorkflowUser = async (user, clientId) => {
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
    client_id: clientId,
  });
};

async function receiveMessage(params) {
  const channel = await findChannel(params.metadata.phone_number_id);
  if (!channel) { throw new Error('Channel not found'); }

  const user = await findOrInsertUser(params.contacts[0]);

  const message = await insertMessage(params.messages[0], user, channel);

  const clientId = await discoverTheClient(message, user, channel);
  const workflowUser = await findOrActivateWorkflowUser(user, clientId);

  await Messages().where('id', message.id).update({
    client_id: clientId,
    workflow_user_id: workflowUser?.id,
  });

  if (workflowUser) {
    workflowRunService(workflowUser);
  }

  return message;
}

async function markMessagesAsRead(params) {
  const whatsappIds = params.statuses.map((status) => status.id);
  const readTimestamp = params.statuses[0].timestamp;

  return Messages().whereIn('whatsapp_id', whatsappIds).update({
    user_read_at: new Date(readTimestamp * 1000),
  });
}

module.exports = async function whatsappReceiveService(params) {
  if (params.statuses) {
    markMessagesAsRead(params);

    return;
  }

  return receiveMessage(params);
};
