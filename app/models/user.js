const { queryBuilder, BaseModel } = require('./base_model.js');

class User extends BaseModel {
  static table_name = 'users';
}
const UsersQuery = () => queryBuilder(User);

module.exports = UsersQuery;
