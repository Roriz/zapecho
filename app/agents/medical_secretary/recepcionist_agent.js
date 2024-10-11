const omitBy = require('lodash/omitBy');
const { BaseAgent } = require('~/agents/base_agent.js');

const HOSPITAL_ESI_LEVELS = ['1', '2'];
const DATA_TO_EXTRACT = {
  chat_is_long_enough_to_make_a_guess_about_speciality: {
    type: 'boolean',
    description: 'Check if the chat is long enough to make a guess about the speciality.'
  },
  looking_for_what_speciality: {
    type: 'string',
    description: 'The speciality that the patient is looking for',
    enum: [
      'Internal Medicine', 'Cardiology', 'Dermatology', 'Pediatrics',
      'Obstetrics and Gynecology', 'General Surgery', 'Orthopedics',
      'Neurology', 'Psychiatry', 'Oncology', 'other', 'not medical', 'not clear',
    ]
  },
  ESI_level: {
    type: 'string',
    description: `
    The ESI levels (Emergency Severity Index) of the patient:
    Level 1 (Immediate): Life-threatening emergencies requiring immediate intervention, such as cardiac arrest, severe trauma, or respiratory failure.
    Level 2 (Emergent): Conditions that require urgent attention but are not immediately life-threatening, like chest pain, acute shortness of breath, or severe infections.
    Level 3 (Urgent): Conditions that are serious but can wait a short time without immediate risk to life, such as moderate pain or injuries.
    Level 4 (Less Urgent): Minor issues, like small cuts or mild symptoms, that can be managed with some delay.
    Level 5 (Non-Urgent): Routine or mild issues, such as a simple prescription refill or minor ailments, that do not require immediate care.
    not clear: If the patient's symptoms are not clear or they are unsure about the urgency.
    `,
    // THINKING: support if patient do not want to share the symptoms
    enum: ['1', '2', '3', '4', '5', 'not clear']
  },
  appointment_type: {
    type: 'string',
    enum: ['initial', 'follow-up', 'not clear'],
    description: 'The type of appointment that the patient is looking for',
  },
}

const PROMPT = `
**You are a medical secretary assisting a specific doctor.**
- Assist patients by determining if their symptoms align with the doctor's specialty.
- Gather relevant information about the patient's symptoms and preferences to assess if they can be seen by the doctor.
- Do not recommend other doctors or services if the patient's symptoms do not match the doctor's specialty.

### **Suggested Steps**:
1. **Greet the patient** and invite them to share details about their symptoms and preferences for the appointment.
2. **Ask clarifying questions** as needed to fully understand their symptoms. Aim for balance gather enough information without overwhelming the patient.
3. Confirm whether the patient is seeking an **initial or follow-up** appointment.
4. **Assess the urgency** of the situation. If it’s a follow-up, skip urgency assessment unless symptoms have worsened.
5. **Call the \`schedule_appointment()\` function** to proceed with scheduling the appointment.

### **Functions**:
- \`schedule_appointment()\` - Send the patient to the next step to schedule an appointment.

### **Expected Happy Path**:
- **Current step**: Confirm if the doctor’s specialty aligns with the patient’s needs.
- **Next step**: Find a convenient date and time based on urgency and patient preferences.
`

class MedicalSecretaryRecepcionistAgent extends BaseAgent {
  async run() {
    this.workflowUser = await this.extractData(this.#dataToExtract());

    if (this.answerData.appointment_type === 'follow-up') {
      return this.goToStatus('schedule_appointment');
    }

    if(!this.#client_has_the_speciality_requested()) {
      return this.goToStatus('not_icp');
    }

    if (HOSPITAL_ESI_LEVELS.includes(this.answerData.ESI_level)) {
      return this.goToStatus('too_urgent');
    }

    if ('appointment_type' in this.answerData && 'ESI_level' in this.answerData, 'looking_for_what_speciality' in this.answerData) {
      return this.goToStatus('schedule_appointment');
    }
    
    this.agentRunParams = await this.threadRun(PROMPT);
    let agentRun = await this.createAgentRun(this.agentRunParams);
    if (agentRun.functions?.schedule_appointment) {
      return this.goToStatus('schedule_appointment');
    }

    return agentRun;
  }

  async #client_has_the_speciality_requested() {
    if ('looking_for_what_speciality' in this.answerData) { return true; }

    const client = await this.client();

    return client.metadata?.specialities.includes(this.answerData.looking_for_what_speciality);
  }

  #dataToExtract() {
    return omitBy(DATA_TO_EXTRACT, (value, key) => key in this.answerData);
  }
}

module.exports = { MedicalSecretaryRecepcionistAgent }
