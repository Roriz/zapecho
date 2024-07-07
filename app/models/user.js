const { queryBuilder, BaseModel } = require('./base_model.js');

class User extends BaseModel {
  static table_name = 'users';

  identifier;
  name;
  last_message_at;
  last_user_interaction_at;
  last_sender_type;
  unread_count;
}
const UsersQuery = () => queryBuilder(User);

module.exports = UsersQuery;
