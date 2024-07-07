const { queryBuilder, BaseModel } = require('./base_model.js');

class Client extends BaseModel {
  static table_name = 'clients';

  name;
  first_workflow_id;
  findable_message;
}

const ClientsQuery = () => queryBuilder(Client);

module.exports = ClientsQuery;
