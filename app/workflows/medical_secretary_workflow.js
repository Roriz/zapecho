const { agentEngine } = require('~/workflows/agent_engine.js');

const { MedicalSecretaryRecepcionistAgent } = require('~/agents/medical_secretary/recepcionist_agent.js')
const { MedicalSecretarySchedulerAgent } = require('~/agents/medical_secretary/scheduler_agent.js')
const { MedicalSecretaryNotIcpAgent } = require('~/agents/medical_secretary/not_icp_agent.js')
const { MedicalSecretaryFinanceAgent } = require('~/agents/medical_secretary/finance_agent.js')
const { MedicalSecretaryTooUrgentAgent } = require('~/agents/medical_secretary/too_urgent_agent.js')

const AGENTS = {
  'new': MedicalSecretaryRecepcionistAgent,
  'recepcionist': MedicalSecretaryRecepcionistAgent,
  'schedule_appointment': MedicalSecretarySchedulerAgent,
  'payment': MedicalSecretaryFinanceAgent,
  'not_icp': MedicalSecretaryNotIcpAgent,
  'too_urgent': MedicalSecretaryTooUrgentAgent,
}

module.exports = async function medicalSecretaryWorkflow(thread) {
  const thread = await agentEngine(thread.id, AGENTS);

  return thread;
}
