const Clients = require('~/models/client.js');
const AgentRuns = require('~/models/agent_run.js');
const ClientsAssistants = require('~/models/clients_assistant.js');
const Messages = require('~/models/message.js');

const ExtractDataService = require('~/services/workflow_users/extract_data_service.js');
const { threadRun, deleteThreadMessage } = require('~/repositories/openai_repository.js');
const { addCart } = require('~/services/carts/add_service.js');

class BaseAgent {
  slug = 'base-agent'; // override this in the subclass

  static run(workflowUser) { return new this(workflowUser).run(); }

  constructor(workflowUser) {
    this.workflowUser = workflowUser;
    this.agentRunParams = undefined
    this.client = undefined
    this.assistant = undefined
  }

  async run() {
    this.client = await Clients().findOne('id', this.workflowUser.client_id);
    // TODO: support multiple assistants per client
    this.assistant = await ClientsAssistants().findOne('client_id', this.workflowUser.client_id);
  }
  
  // Support methods

  get answerData() {
    return this.workflowUser.answers_data;
  }

  async totalMessagesCount() {
    const response = await Messages().where('workflow_user_id', this.workflowUser.id).count();
    return response[0].count;
  }

  goToStatus(next_status) {
    return this.createAgentRun({
      next_status,
      is_complete: true
    });
  }

  async find_product(code_or_name) {
    return await Products().findOne({
      client_id: this.workflowUser.client_id,
      code: code_or_name
    }) || await Products().findOne({
      client_id: this.workflowUser.client_id,
      name: code_or_name
    });
  }

  addCart(productId, quantity = 1) {
    return addCart({
      user_id: this.workflowUser.user_id,
      client_id: this.workflowUser.client_id,
      product_id: productId,
      quantity,
    });
  }

  async threadRun(prompt) {
    this.agentRunParams = await threadRun(
      this.workflowUser.openai_thread_id,
      this.assistant.openai_id,
      prompt
    );

    const agentRun = await this.createAgentRun(this.agentRunParams);
    agentRun.message_body = this.compileMessageBody(agentRun.message_body);

    return agentRun;
  }

  compileMessageBody(messageBody) {
    let compiledMessageBody = messageBody;

    const contextVariables = {
      client_name: this.client.name,
      clinic_address: this.client.metadata?.address,
      clinic_phone: this.client.metadata?.phone,
      clinic_website: this.client.metadata?.website,
      assistant_name: this.assistant.assistant_name,
    };
    
    Object.keys(contextVariables).forEach(key => {
      if (!contextVariables[key]) { return; }

      compiledMessageBody = compiledMessageBody.replaceAll(
        `{{ ${key} }}`, contextVariables[key]
      ).replaceAll(`{{${key}}}`, contextVariables[key]).trim();
    })

    return compiledMessageBody
  }

  async deleteRunAndGoToStatus(next_status) {
    await this.deleteThreadRun();
    return this.goToStatus(next_status);
  }

  deleteThreadRun() {
    return deleteThreadMessage(
      this.workflowUser.openai_thread_id,
      this.agentRunParams.openai_message_id
    );
  }

  createAgentRun(params) {
    return AgentRuns().insert({
      ...params,
      agent_slug: this.constructor.name,
      workflow_user_id: this.workflowUser.id,
      workflow_user_status: this.workflowUser.status,
    });
  }

  async extractData(dataToExtract) {
    if(Object.keys(dataToExtract || {}).length === 0) { return this.workflowUser; }

    this.workflowUser = await ExtractDataService(this.workflowUser, dataToExtract);
    
    return this.workflowUser;
  }

}

module.exports = {
  BaseAgent
}
