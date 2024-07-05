const pickBy = require('lodash/pickBy');
const Clients = require('~/models/client.js');
const ClientsAssistants = require('~/models/clients_assistant.js');
const { openaiSDK } = require('~/repositories/openai_repository.js');

const DEFAULT_MODEL = 'gpt-3.5-turbo';
const DEFAULT_LOCALE = 'en';
const DEFAULT_CATEGORY = 'default';

async function ClientsAssistantsUpsertService(params) {
  let clientsAssistant = await ClientsAssistants().findOne({
    client_id: params.client_id,
    category: params.category || DEFAULT_CATEGORY,
  });

  if (!clientsAssistant) {
    clientsAssistant = await ClientsAssistants().insert({
      instructions: params.instructions,
      model: params.model || DEFAULT_MODEL,
      assistant_name: params.assistant_name,
      client_id: params.client_id,
      category: params.category || DEFAULT_CATEGORY,
      locale_iso2: params.locale_iso2 || DEFAULT_LOCALE,
    });
  }

  const client = await Clients().findOne({ id: clientsAssistant.client_id });
  const openaiAssistant = await openaiSDK().beta.assistants.create({
    name: `${client.name} - ${clientsAssistant.category} - ${clientsAssistant.id}`,
    instructions: clientsAssistant.instructions,
    model: clientsAssistant.model,
  });

  const attributesToUpdate = pickBy({
    openai_id: openaiAssistant.id,
    openai_created_at: new Date(openaiAssistant.created_at * 1000),
    instructions: params.instructions,
    model: params.model,
    locale_iso2: params.locale_iso2,
  });

  return ClientsAssistants().updateOne(clientsAssistant, attributesToUpdate);
}

module.exports = { ClientsAssistantsUpsertService };
