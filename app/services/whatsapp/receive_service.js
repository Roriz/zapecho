const { Client } = require('knex');
const User = require('../../models/user.js');
const Message = require('../../models/message.js');
const AgentUser = require('../../models/agent_user.js');
const Channel = require('../../models/channel.js');
const fileStorageCreateService = require('../file_storages/create_service.js');
const { downloadMedia } = require('../../repositories/whatsapp_repository.js');
const runAgentService = require('../agents/run_agent_service.js');

const findChannel = (phoneId) => Channel().where('external_id', phoneId).first();

const findOrInsertUser = async (params) => {
  const user = await User().where('identifier', params.wa_id).first();

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

const clientByUser = async (user) => {
  const agentUser = await AgentUser().where({ user_id: user.id, final_step_at: null }).first();

  return agentUser?.client_id;
};

const clientByMessage = async (message) => {
  const client = await Client().where('findable_message', message.body).first();

  return client?.id;
};

const discoverTheClient = async (message, user, channel) => {
  const clientId = channel.client_id || await clientByUser(user) || await clientByMessage(message);

  if (!clientId) { return null; }

  return clientId;
};

const discoverOrActivateAgentUser = async (user, clientId) => {
  const agentUser = await AgentUser().where({ user_id: user.id, final_step_at: null }).first();

  if (agentUser) { return agentUser; }

  if (clientId) {
    const client = await Client().where('id', clientId).first();

    return AgentUser().insert({
      user_id: user.id,
      agent_id: client.first_agent_id,
      client_id: clientId,
    });
  }

  // TODO: active router-agent
  // const agent = Agent().where('id', ROUTER_AGENT_ID).first();
  // AgentUser().insert({
  //   user_id: user.id,
  //   agent_id: agent.id,
  //   client_id: clientId,
  // });
  return null;
};

module.exports = async function whatsappReceiveService(params) {
  const channel = await findChannel(params.metadata.phone_number_id);
  if (!channel) { throw new Error('Channel not found'); }

  const user = await findOrInsertUser(params.contacts[0]);

  const message = await insertMessage(params.messages[0], user, channel);
  await attachMedia(params.messages[0], message);

  const clientId = await discoverTheClient(message, user, channel);
  const agentUser = await discoverOrActivateAgentUser(message, user, clientId);

  await Message().where('id', message.id).update({
    client_id: clientId,
    agent_user_id: agentUser?.id,
  });

  if (agentUser) {
    runAgentService(agentUser);
  }

  return message;
};
