const { BaseAgent } = require('~/agents/base_agent.js');
const WorkflowUsers = require('~/models/workflow_user.js');

const MESSAGE = `
Pelo que você descreveu, é importante que procure atendimento emergencial o mais rápido possível em um hospital.
Infelizmente, não podemos oferecer o suporte adequado neste momento.
Não deixe de ir ao pronto-socorro para garantir a avaliação necessária.
`

class MedicalSecretaryTooUrgentAgent extends BaseAgent {
  async run() {
    await WorkflowUsers().updateOne(this.workflowUser, { finished_at: new Date() });

    return this.createAgentRun({
      message_body: MESSAGE,
      is_complete: true
    });
  }
}

module.exports = { MedicalSecretaryTooUrgentAgent }
