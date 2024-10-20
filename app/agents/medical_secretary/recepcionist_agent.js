const pick = require('lodash/pick');
const { BaseAgent } = require('~/agents/base_agent.js');
const WorkflowUsers = require('~/models/workflow_user.js');

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
3. discover_if_could_potentially_be_treated: Ask questions to understand their symptoms. Gather enough information without overwhelming the patient. Make a fair guess about the speciality that can treat them.
4. discover_is_life_threatening: Ask questions to assess the urgency based on their symptoms. Gather enough information without overwhelming the patient. Make a fair guess about the urgency of the situation.
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

class MedicalSecretaryRecepcionistAgent extends BaseAgent {
  async run() {
    this.client = await this.client();

    if (this.#agentCompleted()) { return this.goToStatus('schedule_appointment'); }

    this.workflowUser = await this.#setCurrentStep();
    
    if (this.workflowUser.current_step_messages_count >= 1) {
      const missingData = this.#missingDataToExtract();
      this.workflowUser = await this.extractData(missingData);
      this.workflowUser = await this.#setCurrentStep();
    }

    if (this.answerData.appointment_type === 'follow-up') { return this.goToStatus('schedule_appointment'); }
    if ('could_potentially_be_treated' in this.answerData && !this.answerData.could_potentially_be_treated) { return this.goToStatus('not_icp'); }
    if ('is_life_threatening' in this.answerData && !this.answerData.is_life_threatening) { return this.goToStatus('too_urgent'); }

    this.agentRunParams = await this.threadRun(this.#prompt());
    let agentRun = await this.createAgentRun(this.agentRunParams);

    if (agentRun.functions?.go_to_schedule_appointment) {
      return this.goToStatus('schedule_appointment');
    }

    if (agentRun.functions?.save_data) {
      const missingData = this.#missingDataToExtract();
      this.workflowUser = await this.extractData(missingData);
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
    } else if ('appointment_type' in this.answerData && 'could_potentially_be_treated' in this.answerData) {
      return WorkflowUsers().updateOne(this.workflowUser, { current_step: 'discover_is_life_threatening' });
    } else if ('appointment_type' in this.answerData) {
      return WorkflowUsers().updateOne(this.workflowUser, { current_step: 'discover_if_could_potentially_be_treated' });
    }

    return WorkflowUsers().updateOne(this.workflowUser, { current_step: 'discover_appointment_type' });
  }

  #prompt() {
    return `${BASE_PROMPT}
addons available:

${this.#saveDataAddonPrompt()}

#### addon {{ go_to_schedule_appointment() }}
Send the patient to the next step to schedule an appointment.
Call this addon when you have 95% confidence about the ${Object.keys(this.#allDataToExtract).join(', ')} have been extracted.

#### addon {{ change_step(step_name: String) }}
Change the current step to the specified step. Possible values: ${Object.keys(this.#steps).join(', ')}
Call {{ change_step(step_name: string) }} if the conversation is not aligned with the objective.

### Objective
${this.#step.objective}`
  }
  
  get #step() {
    return this.#steps[this.workflowUser.current_step];
  }

  #agentCompleted() {
    return Object.keys(this.#allDataToExtract).every(key => key in this.answerData);
  }

  #missingDataToExtract() {
    const keysToExtract = Object.keys(this.#step?.dataToExtract || {});
    const keysExtracted = Object.keys(this.answerData);

    const missingKeys = keysToExtract.filter(key => !keysExtracted.includes(key));
    return pick(this.#step?.dataToExtract, missingKeys);
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
${descriptions.join('\n')}`
  }

  get #allDataToExtract() {
    return {
      appointment_type: {
        type: 'string',
        description: 'The type of appointment the patient is looking for. Possible values: initial, follow-up',
        enum: ['initial', 'follow-up']
      },
      could_potentially_be_treated: {
        type: 'boolean',
        description: `The patient's symptoms could potentially be treated by any of specialities: ${this.client.metadata?.specialities.join(', ')}.`
      },
      is_life_threatening: {
        type: 'boolean',
        description: `The patient's symptoms are life-threatening.`
      },
    }
  }

  get #steps() {
    return {
      greet_patient: {
        objective: 'You are on step greet_patient. Focus on engaging the patient and finding out if they are returning. Avoid being too pushy.',
        dataToExtract: {}
      },
      discover_appointment_type: {
        objective: 'You are on step discover_appointment_type. Focus on determining the appointment type. Once you have enough data to determine the type, call the addon {{ save_data(appointment_type: string) }}',
        dataToExtract: { appointment_type: this.#allDataToExtract.appointment_type }
      },
      discover_if_could_potentially_be_treated: {
        objective: `You are on step discover_if_could_potentially_be_treated. Focus on determining the doctor with the specialities: ${this.client.metadata?.specialities.join(', ')} that can treat the patient's in any level. Once you have 95% confidence about the speciality, call the addon {{ save_data(could_potentially_be_treated: boolean) }}`,
        dataToExtract: { could_potentially_be_treated: this.#allDataToExtract.could_potentially_be_treated }
      },
      discover_is_life_threatening: {
        objective: `You are on step discover_is_life_threatening. Focus on assessing the patient's symptoms and determining if they are life-threatening. Once you have 95% confidence about the urgency, call the addon {{ save_data(is_life_threatening: boolean) }}`,
        dataToExtract: { is_life_threatening: this.#allDataToExtract.is_life_threatening }
      }
    }
  }
}

module.exports = { MedicalSecretaryRecepcionistAgent }
