import User from '../../models/user.js';
import Message from '../../models/message.js';

const findOrInsertUser = async (params) => {
  const user = await User().where('identifier', params.wa_id).first();

  if (user) { return user; }

  return (await User().insert({
    identifier: params.wa_id,
    name: params.profile.name,
  }).returning('*'))[0];
};

const insertMessage = (params, user) => Message().insert({
  user_id: user.id,
  body: params.text?.body,
  message_type: params.type,
  whatsapp_id: params.id,
  whatsapp_created_at: new Date(params.timestamp * 1000),
  user_read_at: params.read_at,
});

export default async function whatsappReceiveService(userParams, messageParams) {
  const user = await findOrInsertUser(userParams);
  return insertMessage(messageParams, user);
}
