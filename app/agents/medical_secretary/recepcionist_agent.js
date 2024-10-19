const pick = require('lodash/pick');
const { BaseAgent } = require('~/agents/base_agent.js');
const WorkflowUsers = require('~/models/workflow_user.js');

const HOSPITAL_ESI_LEVELS = ['1', '2'];
const SPECIALITIES = ['Internal Medicine', 'Cardiology', 'Dermatology', 'Pediatrics', 'Obstetrics and Gynecology', 'General Surgery', 'Orthopedics', 'Neurology', 'Psychiatry', 'Oncology', 'other', 'not medical'];
const BASE_PROMPT = `
You are a medical secretary assisting a specific doctor. You will create the next template message that will be compiled and send to the patient. The template can include variables and addons to enhance the conversation.
Help patients determine if their symptoms match the doctor's specialty.
Gather relevant information about their symptoms and preferences to determine if the doctor can treat them.
Do not suggest other doctors or services if their symptoms don't match the doctor's specialty.
patient and user are interchangeable terms.

## Suggested Steps
You do not need to follow these steps in order. Use your judgment to guide the conversation. But here are suggested order of steps:
1. greet_patient: Introduce the doctor and offer to answer any questions.
2. discover_appointment_type: Check if the patient is seeking an initial or follow-up appointment.
3. discover_the_medical_speciality: Ask questions to understand their symptoms. Gather enough information without overwhelming the patient. Make a fair guess about the needed specialty.
4. discover_the_urgency: Ask questions to assess the urgency. Gather enough information without overwhelming the patient. Make a fair guess about whether the patient needs hospital care.
5. schedule_appointment: Call the {{ go_to_schedule_appointment() }} addon to proceed with scheduling.

## Addons
Addons are called at any time during the conversation to save the patient's responses or move the conversation forward.
To call a addon, use this format: {{ addon_name(argument_name: 'value') }}
Example with a addon:
\`\`\`
assistant: What is your name?
user: John
assistant: {{ save_name(name: 'John') }} Thank you. How can I help you today?
\`\`\`

`

const DATA_TO_EXTRACT = {
  appointment_type: {
    type: 'string',
    description: 'The type of appointment the patient is looking for.',
    enum: ['initial', 'follow-up']
  },
  looking_for_what_speciality: {
    type: 'string',
    description: 'The speciality the patient is looking for.',
    enum: SPECIALITIES
  },
  esi_level: {
    type: 'number',
    description: `The ESI (Emergency Severity Index) level of the patient's symptoms.
    - Level 1 (Immediate): Life-threatening emergencies needing immediate care, such as cardiac arrest, severe trauma, or respiratory failure.
    - Level 2 (Emergent): Urgent conditions that are not immediately life-threatening, like chest pain, shortness of breath, or severe infections.
    - Level 3 (Urgent): Serious conditions that can wait a short time without immediate risk to life, such as moderate pain or injuries.
    - Level 4 (Less Urgent): Minor issues like small cuts or mild symptoms, which can be managed with some delay.
    - Level 5 (Non-Urgent): Routine or mild issues like prescription refills or minor ailments that do not require immediate care.
    `,
    enum: [1, 2, 3, 4, 5]
  },
}

const STEPS = {
  greet_patient: {
    objective: 'You are on step greet_patient. Focus on engaging the patient and finding out if they are returning. Avoid being too pushy.',
    dataToExtract: {}
  },
  discover_appointment_type: {
    objective: 'You are on step discover_appointment_type. Focus on determining the appointment type. Once you have enough data to determine the type, call the addon {{ save_data(appointment_type: String) }}',
    dataToExtract: { appointment_type: DATA_TO_EXTRACT.appointment_type }
  },
  discover_the_medical_speciality: {
    objective: `You are on step discover_the_medical_speciality. Focus on determining the medical speciality the patient wants. Once you have enough data to determine the speciality, call the addon {{ save_data(looking_for_what_speciality: String) }}`,
    dataToExtract: { looking_for_what_speciality: DATA_TO_EXTRACT.looking_for_what_speciality }
  },
  discover_the_urgency: {
    objective: `You are on step discover_the_urgency. Focus on assessing the patient's symptoms and determining the urgency of the situation. Once you have enough data to determine the urgency, call the addon {{ save_data(esi_level: Number) }}`,
    dataToExtract: { esi_level: DATA_TO_EXTRACT.esi_level }
  }
}

class MedicalSecretaryRecepcionistAgent extends BaseAgent {
  async run() {
    if (this.#agentCompleted()) { return this.goToStatus('schedule_appointment'); }

    this.workflowUser = await this.#setCurrentStep();
    
    const missingData = this.#missingDataToExtract();
    if (Object.keys(missingData).length) {
      this.workflowUser = await this.extractData(missingData);
    }

    if (this.answerData.appointment_type === 'follow-up') { return this.goToStatus('schedule_appointment'); }
    if (!(await this.#speciality_requested_and_client_match())) { return this.goToStatus('not_icp'); }
    if (HOSPITAL_ESI_LEVELS.includes(esiLevel)) { return this.goToStatus('too_urgent'); }

    this.agentRunParams = await this.threadRun(this.#prompt());
    let agentRun = await this.createAgentRun(this.agentRunParams);

    if (agentRun.functions?.go_to_schedule_appointment) {
      return this.goToStatus('schedule_appointment');
    }

    if (agentRun.functions?.save_data) {
      this.workflowUser = await this.workflowUser.addAnswerData(agentRun.functions.save_data);
      await this.deleteThreadRun();
      return MedicalSecretaryRecepcionistAgent.run(this.workflowUser);
    }

    if (agentRun.functions?.change_step) {
      this.workflowUser = await this.workflowUser.updateOne(this.workflowUser, { current_step: agentRun.functions.change_step.arguments.step_name });
      await this.deleteThreadRun();
      return MedicalSecretaryRecepcionistAgent.run(this.workflowUser);
    }

    return agentRun;
  }

  #setCurrentStep() {
    if (!this.workflowUser.current_step) {
      return WorkflowUsers().updateOne(this.workflowUser, { current_step: 'greet_patient' });
    } else if ('appointment_type' in this.answerData && 'looking_for_what_speciality' in this.answerData) {
      return WorkflowUsers().updateOne(this.workflowUser, { current_step: 'discover_the_urgency' });
    } else if ('appointment_type' in this.answerData) {
      return WorkflowUsers().updateOne(this.workflowUser, { current_step: 'discover_the_medical_speciality' });
    }

    return WorkflowUsers().updateOne(this.workflowUser, { current_step: 'discover_appointment_type' });
  }

  #prompt() {
    return `
    ${BASE_PROMPT}
    addons available:
    
    ${this.#saveDataAddonPrompt()}
    
    #### addon {{ go_to_schedule_appointment() }}
    Send the patient to the next step to schedule an appointment.
    Call this addon when you have 95% confidence about the ${Object.keys(DATA_TO_EXTRACT).join(', ')} have been extracted.

    #### addon {{ change_step(step_name: String) }}
    Change the current step to the specified step. Possible values: ${Object.keys(STEPS).join(', ')}
    Call {{ change_step(step_name: String) }} if the conversation is not aligned with the objective.

    ### Objective
    ${this.#step.objective}
    `
  }

  get #step() {
    return STEPS[this.workflowUser.current_step];
  }

  #agentCompleted() {
    return this.#missingDataToExtract().length === 0;
  }

  #missingDataToExtract() {
    const keysToExtract = Object.keys(this.#step.dataToExtract);
    const keysExtracted = Object.keys(this.answerData);

    const missingKeys = keysToExtract.filter(key => !keysExtracted.includes(key));
    return pick(this.#step.dataToExtract, missingKeys);
  }

  #saveDataAddonPrompt() {
    if (!Object.keys(this.#step.dataToExtract).length) { return ''; }
    
    const args = [];
    const descriptions = [];
    for (const [key, value] of Object.entries(this.#step.dataToExtract)) {
      args.push(`${key}?: ${value.type}`);
      descriptions.push(`- ${key}: ${value.description}`);
    }

    return `#### addon {{ save_data(${args.join(', ')}) }}
    Save the data extracted from the patient's response. Use the following arguments:
    ${descriptions.join('\n')}
    `
  }

  async #speciality_requested_and_client_match() {
    const client = await this.client();

    return client.metadata?.specialities.includes(this.answerData.looking_for_what_speciality);
  }
}

module.exports = { MedicalSecretaryRecepcionistAgent }
