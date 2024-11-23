const Clients = require('~/models/client.js');
const AgentRuns = require('~/models/agent_run.js');
const Threads = require('~/models/thread.js');
const ClientsAssistants = require('~/models/clients_assistant.js');
const Messages = require('~/models/message.js');

const ExtractDataService = require('~/services/threads/extract_data_service.js');
const { threadRun, deleteThreadMessage } = require('~/repositories/openai_repository.js');
const { addCart } = require('~/services/carts/add_service.js');

class BaseAgent {
  slug = 'base-agent'; // override this in the subclass


  async goToStatus(next_status) {
    this.workflowUser = await Threads().updateOne(this.workflowUser, { current_step: null });

    return await this.createAgentRun({
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
      thread_id: this.workflowUser.id,
      thread_status: this.workflowUser.status,
    });
  }

  async extractData(dataToExtract = {}) {
    if(Object.keys(dataToExtract).length === 0) { return {}; }

    let extractedData = await ExtractDataService(this.workflowUser, dataToExtract);
    return await this.addAnswerData(extractedData);
  }

  // INFO: Dictionary of functions to be applied to the extracted data before saving
  //       Example: ON_CHANGE = { user_name: (value) => value === 'lorem' ? 'ipsum' : value } // change 'lorem' to 'ipsum'
  //       Example: ON_CHANGE = { user_age: (value) => value > 200 ? null : value } // remove value if it's greater than 200
  ON_CHANGE = {}
  async addAnswerData(newAnswerData) {
    const oldAnswerData = this.workflowUser.answers_data;

    const changedKeys = Object.keys(newAnswerData).filter(key => oldAnswerData[key] !== newAnswerData[key]);
    
    const dataToSave = {};
    for (const key of changedKeys) {
      let value = newAnswerData[key];
      if (this.ON_CHANGE[key]) {
        value = await this.ON_CHANGE[key].bind(this)(value);
      }

      if (value) {
        dataToSave[key] = newAnswerData[key];
      }
    }

    if (Object.keys(dataToSave).length > 0) {
      this.workflowUser = await this.workflowUser.addAnswerData(dataToSave);
    }

    return dataToSave;
  }

}

module.exports = {
  BaseAgent
}
