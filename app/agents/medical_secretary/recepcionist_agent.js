const { BaseAgent } = require('~/agents/base_agent.js');
const WorkflowUsers = require('~/models/workflow_user.js');

const BASE_PROMPT = `
You are a medical secretary. Responsible for managing and responding to the clinic's digital communication channel.
Your role is to write the most effective template message to convert a potential patient into an actual patient or to improve the patient experience.

# Journey
The patient is in the early stages of their journey. Your goal is to guide them from the start of the conversation to scheduling an appointment.

## Suggested Steps
You do not need to follow these steps in order. Use your judgment to guide the conversation. Here is the suggested order of steps:
1. greet_patient: Introduce the doctor and offer to answer any questions.
2. discover_appointment_type: Check if the patient is seeking an initial or follow-up appointment.
3. discover_if_could_potentially_be_treated: Ask questions to understand their symptoms. Gather enough information to determine the appropriate specialty without overwhelming the patient.
4. discover_is_life_threatening: Ask questions to assess the urgency of the symptoms. Gather enough information to determine the urgency without overwhelming the patient.
5. schedule_appointment: Call the {{ go_to_schedule_appointment() }} addon to proceed with scheduling
`

// TODO: split between secretary and recepcionist. where secretary is the lead qualification and recepcionist is the one that point to the right agent
class MedicalSecretaryRecepcionistAgent extends BaseAgent {
  async run() {
    await super.run();

    if (this.#agentCompleted()) { return this.goToStatus('schedule_appointment'); }

    this.workflowUser = await this.#setCurrentStep();
    
    if (this.workflowUser.current_step_messages_count >= 1) {
      const oldAnswerData = this.workflowUser.answer_data;
      this.workflowUser = await this.extractData(this.#step?.dataToExtract);
      const newAnswerData = this.workflowUser.answer_data;

      if (oldAnswerData !== newAnswerData) {
        return MedicalSecretaryRecepcionistAgent.run(this.workflowUser);
      }
    }

    if (this.answerData.appointment_type === 'follow-up') { return this.goToStatus('schedule_appointment'); }
    if ('could_potentially_be_treated' in this.answerData && !this.answerData.could_potentially_be_treated) { return this.goToStatus('not_icp'); }
    if (this.answerData.is_life_threatening) { return this.goToStatus('too_urgent'); }

    const agentRun = await this.threadRun(this.#prompt());

    if (agentRun.functions?.go_to_schedule_appointment) {
      return this.goToStatus('schedule_appointment');
    }

    if (agentRun.functions?.save_data) {
      this.workflowUser = await this.workflowUser.addAnswerData(agentRun.functions?.save_data.arguments);
      await this.deleteThreadRun();
      return MedicalSecretaryRecepcionistAgent.run(this.workflowUser);
    }

    if (agentRun.functions?.change_step) {
      const newStep = agentRun.functions.change_step.arguments.step_name;

      if (newStep in this.#steps) {
        this.workflowUser = await this.workflowUser.updateOne(this.workflowUser, { current_step: newStep });
        await this.deleteThreadRun();
        return MedicalSecretaryRecepcionistAgent.run(this.workflowUser);
      }
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
# Addons available:
${this.#saveDataAddonPrompt()}

#### addon {{ go_to_schedule_appointment() }}
Send the patient to the next step to schedule an appointment.
Call this addon when you have confidence that the itemsÇ ${Object.keys(this.#allDataToExtract).join(', ')} has been defined.

#### addon {{ change_step(step_name: string) }}
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
        objective: `You are on step discover_if_could_potentially_be_treated. Focus on determining the doctor with the specialities: ${this.client.metadata?.specialities?.join(', ') || 'general medicine'} that can treat the patient's in any level. Once you have 95% confidence about the speciality, call the addon {{ save_data(could_potentially_be_treated: boolean) }}`,
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
