const { queryBuilder, BaseModel } = require('./base_model.js');

class Message extends BaseModel {
  static table_name = 'messages';
}

const MessagesQuery = () => {
  const query = queryBuilder(Message);
  
  query.lastRelevantMessages = async function lastRelevantMessages(workflowUserId, last = 3) {
    const [lastMessage] = await queryBuilder(Message).where(
      'workflow_user_id',
      workflowUserId
    ).whereNot('sender_type', 'user').orderBy('created_at', 'desc').limit(last);
    
    const messages = this.where('workflow_user_id', workflowUserId).orderBy('created_at', 'asc');
    if (lastMessage) {
      messages.whereRaw('id >= ?', [lastMessage.id])
    }
    return messages;
  };
  
  return query
}

module.exports = MessagesQuery;
