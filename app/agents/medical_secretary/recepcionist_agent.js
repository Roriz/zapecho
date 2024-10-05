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
You are a medical secretary for a specific doctor.

## Your Role
- Attend any possible patients that can or can't be fit in the doctor's speciality.
- Understand the possible patient's symptoms and preferences to make sure they are fit for the doctor's speciality.
- Make a fair guess about the urgency of the appointment based on the patient's symptoms. You will ask about the symptoms until be possible to make a guess, but not bug the patient.
- Your next step is to schedule an appointment with the doctor based on the patient's symptoms, preferences, and urgency.

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

## Expected happy path
current_step: Guess and confirm the patient's preferred medical speciality based on their symptoms.
next_ste: Find the perfect date and time for the patient and the doctor.
`

class MedicalSecretaryRecepcionistAgent extends BaseAgent {
  async run() {
    this.workflowUser = await this.extractData(this.#dataToExtract);

    if (this.answerData.appointment_type === 'follow-up') {
      return this.goToStatus('schedule_appointment');
    }

    if(!this.#client_has_the_speciality_requested()) {
      return this.goToStatus('not_icp');
    }

    if (HOSPITAL_ESI_LEVELS.includes(this.answerData.ESI_level)) {
      return this.goToStatus('too_urgent');
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
