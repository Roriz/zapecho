const { queryBuilder, BaseModel } = require('./base_model.js');

class Message extends BaseModel {
  static table_name = 'messages';
}

const MessagesQuery = () => {
  const query = queryBuilder(Message);
  
  query.lastRelevantMessages = async function lastRelevantMessages(workflowUserId, last = 3) {
    const lastMessages = await queryBuilder(Message).where(
      'workflow_user_id',
      workflowUserId
    ).whereNot('sender_type', 'user').orderBy('created_at', 'desc').limit(last);
    const oldestMessage = lastMessages.length ? lastMessages[lastMessages.length - 1] : undefined;
    
    const messages = this.where('workflow_user_id', workflowUserId).orderBy('created_at', 'asc');
    if (oldestMessage) {
      messages.whereRaw('id >= ?', [oldestMessage.id])
    }
    return messages;
  };
  
  return query
}

module.exports = MessagesQuery;
