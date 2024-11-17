const WorkflowUsers = require('~/models/workflow_user.js');
const { BaseAgent } = require('~/agents/base_agent.js');
const envParams = require('#/configs/env_params.js');
const { availableSlots } = require('~/services/calendar/available_slots.js')
const { GoogleCalendarRepository } = require('~/repositories/google_calendar_repository.js')

const nextDay = (dateString = undefined) => {
  let tomorrow = new Date();
  if (dateString) { tomorrow = new Date(dateString); }

  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

const todayText = () => {
  const d = new Date();
  const weekDay = new Date(d.date_time).toLocaleDateString('en-US', { weekday: 'long' });

  return `${d.toISOString().split('T')[0]} (${weekDay})`;
}

const BASE_PROMPT = `
You are a medical secretary managing the digital communication channels of a clinic. Your key objective is to effectively engage with potential and current patients in order to either convert inquiries into bookings or improve the overall patient experience.

When interacting with patients, you should aim to:
- Match their availability with the doctor's schedule to secure an appointment.
- Confirm the details of the appointment, ensuring the patient is fully informed.

You have full discretion over the conversation flow, meaning there is no strict order for how each step is taken. Use your judgment to tailor each message to the patient's individual needs as effectively as possible.

# Steps
The following suggested actions can be used as needed to proceed through the conversation smoothly:
1. **Suggest Available Appointment Times**:
  - Proactively suggest two of the best available appointment slots that match the doctor’s schedule.
  - Alternatively, if the patient inquires about a specific date, use the \`{{ save_data(appointment_search_date: datetime, appointment_search_preferences: string) }}\` function to check the doctor's availability.
   
2. **Confirm Appointment**:
  - Once the patient chooses a time, provide a clear and polite appointment confirmation with the date and time.
  
3. **Proceed to Payment**:
  - Once an appointment is confirmed, initiate the payment process by calling the \`{{ go_to_payment() }}\` addon.
`

class MedicalSecretarySchedulerAgent extends BaseAgent {
  async run() {
    await super.run();
    
    if (this.#agentCompleted()) { return this.#success(); }

    if (!this.workflowUser.current_step) {
      this.workflowUser = await WorkflowUsers().updateOne(this.workflowUser, { current_step: 'suggest_appointment_times' });
    }

    const extractedData = await this.extractData(this.#step?.dataToExtract);
    if (Object.keys(extractedData).length) {
      this.workflowUser = await this.#nextStep();
      return this.rerun();
    }

    const agentRun = await this.threadRun(await this.#prompt());

    if (agentRun.functions?.go_to_payment) { return this.#success(); }
    if (agentRun.functions?.save_data) {
      const newData = await this.addAnswerData(agentRun.functions?.save_data.arguments);

      if (Object.keys(newData).length) {
        await this.deleteThreadRun();
        this.workflowUser = await this.#nextStep();
        return this.rerun();
      }
    }

    return agentRun;
  }

  ON_CHANGE = {
    appointment_date_ISO8601: this.#onAppointmentDateChange,
  }
  
  get #step() {
    return this.#steps[this.workflowUser.current_step];
  }

  #agentCompleted() {
    return this.answerData.appointment_confirmed && this.answerData.appointment_date_ISO8601;
  }

  async #success() {
    const [startDateTime, endDateTime] = this.#getAppointmentSlot(
      this.answerData.appointment_date_ISO8601
    );

    await GoogleCalendarRepository.createEvent({
      "summary": `Consultation with ${this.workflowUser.user_id}`,
      "location": `${this.workflowUser.client_id} office`,
      "start": {
        "dateTime": startDateTime
      },
      "end": {
        "dateTime": endDateTime.toISOString()
      },
      "attendees": [
        { "email": envParams('default_email') }
      ]
    }, this.workflowUser.client_id);

    return this.goToStatus('payment');
  }

  async #nextStep() {
    let nextStep = 'search_availabilities_for';
    
    if (this.answerData.appointment_date_ISO8601) {
      nextStep = 'confirm_appointment';
    } else if (this.answerData.suggested_appointment_time_rejected) {
      this.workflowUser = await this.workflowUser.delAnswerData('appointment_date_ISO8601');
      nextStep = 'search_availabilities_for';
    } else if (this.answerData.appointment_search_date) {
      this.workflowUser = await this.workflowUser.delAnswerData('suggested_appointment_time_rejected');
      nextStep = 'suggest_appointment_times';
    }

    return await WorkflowUsers().updateOne(this.workflowUser, { current_step: nextStep });
  }
  
  async #prompt() {
    let prompt = `${BASE_PROMPT}
# Today
Act like today is ${todayText()}.

# Addons available:
${this.#saveDataAddonPrompt()}

#### addon {{ go_to_payment() }}
Send the patient to the next step to schedule an appointment.
Call this addon when you have confidence that the items appointment_date_ISO8601 has been defined.`

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
If patient accepts the suggested time, call the addon {{ save_data(appointment_date_ISO8601: string) }}, but if the patient rejects the suggested time, call the addon {{ save_data(suggested_appointment_time_rejected: boolean) }}
`,
        dataToExtract: {
          appointment_date_ISO8601: {
            type: 'string',
            description: 'The date and time the patient wants to schedule the appointment. Date and time entries in the format \`YYYY-MM-DDTHH:MM:SS\`. Ignore the timezone.'
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

  async #onAppointmentDateChange(dateString) {
    const date = new Date(dateString);

    if (date.toString() == 'Invalid Date') { return; }
    // FIXME: Make sure date has some timezone set
    if (date < new Date()) { return; }

    const [startDateTime, endDateTime] = this.#getAppointmentSlot(dateString);

    const busySlots = await GoogleCalendarRepository.getBusySlots(
      this.workflowUser.client_id,
      startDateTime,
      endDateTime
    );
    if (busySlots.length) { return; }

    return dateString;
  }

  #getAppointmentSlot(dateString) {    
    const startDateTime = new Date(dateString);
    const durantion = this.client.metadata?.appointment_duration || 60;
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + durantion);

    return [startDateTime, endDateTime];
  }
}

module.exports = { MedicalSecretarySchedulerAgent }

