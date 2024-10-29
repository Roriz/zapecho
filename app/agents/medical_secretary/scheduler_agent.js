const WorkflowUsers = require('~/models/workflow_user.js');
const { BaseAgent } = require('~/agents/base_agent.js');
const availableSlots = require('~/services/calendar/available_slots.js')

const nextDay = (dateString = undefined) => {
  const tomorrow = new Date(dateString);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

const BASE_PROMPT = `
You are a medical secretary. Responsible for managing and responding to the clinic's digital communication channel.
Your role is to write the most effective template message to convert a potential patient into an actual patient or to improve the patient experience.

# Steps
The suggested steps is to match the patient's availability with the doctor's schedule to book an appointment and confirm the appointment date and time.
You do not need to follow these steps in order. Use your judgment to guide the conversation.
Here is the suggested order of steps:
1. Match the patient's availability with the doctor's schedule to book an appointment. Suggestions:
  1.1. suggest_appointment_times: Suggest the two best available appointment times to the patient.
  1.2. search_availabilities_for: Check the availability of the doctor for a specific date. 
2. confirm_appointment: Confirm the appointment date and time.
3. payment: call the {{ go_to_payment() }} addon to proceed with the payment process.
`

class MedicalSecretarySchedulerAgent extends BaseAgent {
  async run() {
    await super.run();
    
    if (this.#agentCompleted()) { return this.goToStatus('payment'); }

    this.workflowUser = await this.#setCurrentStep();
    
    if (this.workflowUser.current_step_messages_count >= 1) {
      this.workflowUser = await this.extractData(this.#step?.dataToExtract);

      return MedicalSecretarySchedulerAgent.run(this.workflowUser);
    }

    const agentRun = await this.threadRun(await this.#prompt());

    if (agentRun.functions?.go_to_payment) { return this.goToStatus('payment'); }
    if (agentRun.functions?.save_data) {
      this.workflowUser = await this.workflowUser.addAnswerData(agentRun.functions?.save_data.arguments);
      await this.deleteThreadRun();
      return MedicalSecretarySchedulerAgent.run(this.workflowUser);
    }

    return agentRun;
  }
  
  get #step() {
    return this.#steps[this.workflowUser.current_step];
  }

  #agentCompleted() {
    return this.answerData.appointment_confirmed && this.answerData.appointment_date_and_time;
  }

  async #setCurrentStep() {
    let nextStep = 'search_availabilities_for';
    if (!this.workflowUser.current_step) {
      nextStep = 'suggest_appointment_times';
    } else if (this.answerData.appointment_date_and_time) {
      nextStep = 'confirm_appointment';
    } else if (this.answerData.appointment_search_date) {
      nextStep = 'suggest_appointment_times';
    }

    return await WorkflowUsers().updateOne(this.workflowUser, { current_step: nextStep });
  }
  
  async #prompt() {
    const prompt = `${BASE_PROMPT}
# Addons available:
${this.#saveDataAddonPrompt()}

#### addon {{ go_to_payment() }}
Send the patient to the next step to schedule an appointment.
Call this addon when you have confidence that the items appointment_date_and_time has been defined.`

    if (this.workflowUser.current_step == 'suggest_appointment_times') {
      const baseDate = this.answerData.appointment_search_date || nextDay();
      const slots = await availableSlots(this.workflowUser.client_id, baseDate, this.answerData.appointment_search_preference);

      prompt += `\n### Available slots
${slots.map(slot => `- ${slot}`).join('\n')}`
    }

    return `${prompt}\n${this.#step.objective}`
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
  
  get #steps() {
    return {
      suggest_appointment_times: {
        objective: `
### Objective
You are on step suggest_appointment_times.
You will receive the two best available appointment times, and you should suggest them to the patient.
If patient accepts the suggested time, call the addon {{ save_data(appointment_date_and_time: datetime) }}, but if the patient rejects the suggested time, call the addon {{ save_data(suggested_appointment_time_rejected: boolean) }}
`,
        dataToExtract: { 
          appointment_date_and_time: {
            type: 'number',
            description: 'The date and time the patient wants to schedule the appointment. date and time entries in the format \`YYYY-MM-DD HH:MM\`'
          },
          suggested_appointment_time_rejected: {
            type: 'boolean',
            description: 'The patient rejects the suggested appointment time.'
          },
        }
      },
      search_availabilities_for: {
        objective: `
### Objective
You are on step search_availabilities_for.
Ask the patient for a specific date and save the search_date with {{ save_data(appointment_search_date: datetime, appointment_search_preferences: string) }}
Patient`,
        dataToExtract: {
          appointment_search_date: {
            type: 'string',
            description: 'The date the patient is looking for an appointment. date in the format `YYYY-MM-DD`'
          },
          appointment_search_preference: {
            type: 'string',
            description: 'The patient has any preferences for the appointment schedule date and time. E.g. "morning", "afternoon"',
          },
        }
      },
      confirm_appointment: {
        objective: `
### Objective
You are on step confirm_appointment.
You will receive the appointment date and time, and you should confirm it with the patient.
After patient respond, call the addon {{ save_data(appointment_confirmed: boolean) }}.`,
        dataToExtract: { 
          appointment_confirmed: {
            type: 'boolean',
            description: 'The patient confirms the appointment schedule date and time.',
          },
         }
      }
    }
  }
}

module.exports = { MedicalSecretarySchedulerAgent }

