const { BaseAgent } = require('~/agents/base_agent.js');

const DATA_TO_EXTRACT = {
  schedule_appointment_day: {
    type: 'number',
    description: 'The day the patient wants to schedule the appointment. From 1 to 31.',
  },
  schedule_appointment_time: {
    type: 'number',
    description: 'The time the patient wants to schedule the appointment. From 0 to 23.',
  },
  schedule_appointment_month: {
    type: 'number',
    description: 'The month the patient wants to schedule the appointment. From 1 to 12.',
  },
  schedule_appointment_year: {
    type: 'number',
    description: 'The for digits year the patient wants to schedule the appointment.',
  },
  schedule_appointment_confirmation: {
    type: 'boolean',
    description: 'The patient confirms the appointment schedule date and time.',
  },
}

const PROMPT = `
You will act as a sheduler for a medical secretary.

## Your Role
- Match the patient availability with the doctor's schedule to book an appointment.
- Confirm the appointment date and time with the patient.

## Suggested Steps
- Start by greeting the patient and asking open-ended questions to understand their symptoms and preferences.
- Listen actively and clarify any ambiguous responses to ensure you understand their needs.
- Inquire about the type of appointment the patient is looking for (initial or follow-up).
- Determine the urgency of the appointment based on the patient's symptoms. Skip if is just a follow-up.
- Guess and confirm the patient's preferred medical speciality based on their symptoms. Skip if is just a follow-up.

## Example Interaction
user: Hi! I'm looking for a doctor.
assistant: Hello! I'm here to help you. Can you tell me more about your symptoms and preferences?
user: I have a skin rash and I need to see a doctor urgently.
assistant: Can you tell me if this is an initial visit or a follow-up appointment?
user: It's an initial visit.
assistant: Understood. Can you describe the rash? Is it itchy or painful?
user: It's itchy and red.
assistant: Thank you for sharing that. Based on your symptoms, I believe you need to see a dermatologist. Is that correct?
user: Yes, that's correct.
assistant: {{ schedule_appointment() }}
`

class MedicalSecretarySchedulerAgent extends BaseAgent {
  async run() {
    await this.extractData(DATA_TO_EXTRACT);

    const client = await this.client();

    if (this.answerData.appointment_type === 'follow-up') {
      return this.goToStatus('schedule_appointment');
    }

    if(this.answerData.patient_looking_for_speciality && !client.metadata?.specialities.includes(this.answerData.patient_looking_for_speciality)) {
      return this.goToStatus('cancel_not_a_client');
    }

    if (this.answerData.ESI_level && HOSPITAL_ESI_LEVELS.includes(this.answerData.ESI_level)) {
      return this.goToStatus('cancel_too_urgent');
    }
    
    this.agentRunParams = await this.threadRun(PROMPT);
    let agentRun = await this.createAgentRun(this.agentRunParams);
    if (agentRun.functions?.schedule_appointment) {
      return this.goToStatus('schedule_appointment');
    }

    return agentRun;
  }
}

module.exports = { MedicalSecretarySchedulerAgent }
