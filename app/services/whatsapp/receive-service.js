import User from '../../models/user.js';
import Message from '../../models/message.js';

const findOrCreateUser = async (params) => {
  const user = await User().where('identifier', params.wa_id).first();

  if (user) { return user; }

  return User().insert({
    identifier: params.wa_id,
    name: params.profile.name,
  });
};

const saveMessage = (params, user) => {
  const message = {
    user_id: user.id,
    body: params.text?.body,
    message_type: params.type,
    whatsapp_id: params.id,
    whatsapp_created_at: params.timestamp,
    user_read_at: params.read_at,
  };

  return Message().insert(message);
};

export default async function whatsappReceiveService(userParams, messageParams) {
  const user = await findOrCreateUser(userParams);
  return saveMessage(messageParams, user);
}
