const { queryBuilder, BaseModel } = require('./base_model.js');

class Message extends BaseModel {
  static table_name = 'messages';

  user_id;
  client_id;
  workflow_user_id;
  body;
  sender_type;
  message_type;
  template_name;
  template_locale;
  template_payload;
  user_reaction;
  user_reacted_at;
  user_read_at;
  client_read_at;
  whatsapp_id;
  whatsapp_created_at;
  openai_id;
}

const MessagesQuery = () => {
  const query = queryBuilder(Message);
  
  query.lastRelevantMessages = async (workflowUserId, last = 3) => {
    const [lastMessage] = await queryBuilder(Message).where(
      'workflow_user_id',
      workflowUserId
    ).whereNot('sender_type', 'user').orderBy('created_at', 'desc').limit(last);
    
    // TODO: use this instead of query
    const messages = query.where('workflow_user_id', workflowUserId).orderBy('created_at', 'asc');
    if (lastMessage) {
      messages.whereRaw('id > ?', [lastMessage.id])
    }
    return messages;
  };
  
  return query
}

module.exports = MessagesQuery;
