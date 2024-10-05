const Clients = require('~/models/client.js');
const AgentRuns = require('~/models/agent_run.js');
const ClientsAssistants = require('~/models/clients_assistant.js');

const ExtractDataService = require('~/services/workflow_users/extract_data_service.js');
const { threadRun, deleteThreadMessage } = require('~/repositories/openai_repository.js');
const { addCart } = require('~/services/carts/add_service.js');

class BaseAgent {
  slug = 'base-agent'; // override this in the subclass

  static run(workflowUser) { return new this(workflowUser).run(); }

  constructor(workflowUser) {
    this.workflowUser = workflowUser;
    this.agentRunParams = undefined
  }

  run() {}
  
  // Support methods

  get answerData() {
    return this.workflowUser.answers_data;
  }

  client() {
    return Clients().findOne('id', this.workflowUser.client_id);
  }

  // TODO: support multiple assistants per client
  assistant() {
    return ClientsAssistants().findOne('client_id', this.workflowUser.client_id);
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
      (await this.assistant()).openai_id,
      prompt
    );

    return this.agentRunParams;
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
    this.workflowUser = await ExtractDataService(this.workflowUser, dataToExtract);
    
    return this.workflowUser;
  }

}

module.exports = {
  BaseAgent
}
