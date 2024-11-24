const { BaseAgent } = require('~/agents/base_agent.js');
const Threads = require('~/models/thread.js');

const BASE_PROMPT = `
You are a medical secretary responsible for managing and responding to the clinic's digital communication channel. Your role is to craft template messages that effectively convert potential patients into actual patients or enhance their patient experience.

# Patient Journey
The patient is currently in the early stages of their journey. Your objective is to smoothly guide them through the initial stages of the conversation until they schedule an appointment.
Use the suggested sequence below as a guide for your conversation. However, feel free to adapt your approach based on the context and patient's responses to ensure a natural, empathetic flow.

# Suggested Steps
1. **greet_patient**: Start by greeting the patient warmly. Introduce the doctor and offer an open invitation to answer any questions. Until the patient wants to schedule an appointment, avoid being too pushy.
2. **discover_appointment_type**: Ask if they are looking for an initial consultation for a new issue or if they need a follow-up visit.
3. **schedule_appointment**: Once enough information has been gathered, proceed with scheduling.
- Use the prebuilt add-on: {{ go_to_schedule_appointment() }}
`

class MedicalSecretaryRecepcionistAgent extends BaseAgent {
  prompt() {
    return `${BASE_PROMPT}
# Addons available:

#### addon {{ go_to_schedule_appointment() }}
Send the patient to the next step to schedule an appointment.
Call this addon when you have confidence that pass through all suggested steps.

### Objective
${this.#step.objective}`
  }

  async success() {
    this.thread = await Threads().updateOne(this.thread, { current_step: null });

    return await AgentRuns().insert({
      thread_id: this.thread.id,
      thread_status: this.thread.status,
      next_status: 'schedule_appointment',
      is_complete: true,
    });
  }

  isCompleted() {
    return this.thread.answerData.appointment_type
  }

  get #step() {
    return this.#steps[this.thread.current_step] || this.#steps.greet_patient;
  }
  
  get #steps() {
    return {
      greet_patient: {
        objective: 'You are on step greet_patient. Focus on engaging the patient and finding out if they are returning. Avoid being too pushy.',
        dataToExtract: {
          want_to_schedule_appointment: {
            type: 'boolean',
            description: 'The patient wants to schedule an appointment.'
          }
        }
      },
      discover_appointment_type: {
        objective: 'You are on step discover_appointment_type. Focus on determining the appointment type. Once you have enough data to determine the type, call the addon {{ save_data(appointment_type: string) }}',
        dataToExtract: {
          appointment_type: {
            type: 'string',
            description: 'The type of appointment the patient is looking for. Possible values: initial, follow-up',
            enum: ['initial', 'follow-up']
          }
        }
      }
    }
  }

  dataToExtraction() {
    return this.#step.dataToExtract;
  }

  onGoToScheduleAppointment() {
    return AgentRuns().insert({
      thread_id: this.thread.id,
      thread_status: this.thread.status,
      next_status: 'schedule_appointment',
      is_complete: true,
      force_rerun: true,
    });
  }

  async onDataChange(changedData) {
    await super.onDataChange(changedData);
    
    let nextStep = 'greet_patient';
    
    if (this.thread.answerData.want_to_schedule_appointment) {
      nextStep = 'discover_appointment_type';
    }

    return await Threads().updateOne(this.workflowUser, { current_step: nextStep });
  }
}

module.exports = { MedicalSecretaryRecepcionistAgent }
