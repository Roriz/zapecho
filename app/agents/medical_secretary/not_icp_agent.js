const { BaseAgent } = require('~/agents/base_agent.js');
const Threads = require('~/models/thread.js');

const MESSAGE = `
Agradeço por entrar em contato. No momento, infelizmente, não atendos as suas necessidades.
Recomendo que consulte um especialista nessa área para o melhor atendimento.
Fico à disposição para qualquer outra necessidade.
`

class MedicalSecretaryNotIcpAgent extends BaseAgent {
  async run() {
    await Threads().updateOne(this.workflowUser, { finished_at: new Date() });

    return this.createAgentRun({
      message_body: MESSAGE,
      is_complete: true
    });
  }
}

module.exports = { MedicalSecretaryNotIcpAgent }
