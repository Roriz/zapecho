const { queryBuilder, BaseModel } = require('./base_model.js');

class ClientsAssistant extends BaseModel {
  static table_name = 'clients_assistants';

  instructions;
  first_message;
  last_message;
  assistant_name;
  model;
  client_id;
  category;
  locale_iso2;
  openai_id;
  openai_created_at;
}

const ClientsAssistantsQuery = () => queryBuilder(ClientsAssistant);

module.exports = ClientsAssistantsQuery;
