const { BaseAgent } = require('~/agents/base_agent.js');

const MESSAGE = `
Legal! Para confirmarmos sua consulta, por favor, realize o pagamento antecipado através deste
link: [Link de Pagamento]. Qualquer dúvida, estou à disposição.
`

class MedicalSecretaryNotIcpAgent extends BaseAgent {
  async run() {
    return this.createAgentRun({
      message_body: MESSAGE,
      is_complete: true
    });
  }
}

module.exports = { MedicalSecretaryNotIcpAgent }
