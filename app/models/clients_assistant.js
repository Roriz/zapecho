const { queryBuilder, BaseModel } = require('./base_model.js');

class ClientsAssistant extends BaseModel {
  static table_name = 'clients_assistants';
}

const ClientsAssistantsQuery = () => queryBuilder(ClientsAssistant);

module.exports = ClientsAssistantsQuery;
