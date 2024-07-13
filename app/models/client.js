const { queryBuilder, BaseModel } = require('./base_model.js');

class Client extends BaseModel {
  static table_name = 'clients';
}

const ClientsQuery = () => queryBuilder(Client);

module.exports = ClientsQuery;
