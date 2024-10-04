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

const BASE_PROMPT = `
You will act as a sheduler for a medical secretary.

## Your Role
- Match the patient availability with the doctor's schedule to book an appointment.
- Confirm the appointment date and time with the patient.

## Suggested Steps
- You will receive the doctor's most closest available date and times. Use the doctor's schedule to suggest a date and time to the patient.
- if the first available date and time is not suitable for the patient, ask the patient the prefered date and time and call the function \`check_availabilities_for(iso_date: string)\`
- Confirm the appointment date and time with the patient, using more formal language.

## Functions
- \`check_availabilities_for(iso_date: string)\` - Check the doctor's all availabilities slots for a specific date. The date should be in the format "YYYY-MM-DD".
`

class MedicalSecretarySchedulerAgent extends BaseAgent {
  async run() {
    await this.extractData(DATA_TO_EXTRACT);

    if (this.answerData.schedule_appointment_confirmation && this.#scheduleDatetime()) {
      return this.goToStatus('payment');
    }
    
    let agentRun = {}
    do {
      // FIXME: add the enduser timezone
      const prompt = `
      ${BASE_PROMPT}

      ## Updated doctor's availabilities
      ${this.#doctorAvailabilities(agentRun?.functions?.check_availabilities_for?.arguments?.iso_date)}
      
      ## Additional Information
      Act like today is ${this.#todayIsoDate()}, ${this.#weekDay()})}.
      `

      this.agentRunParams = await this.threadRun(prompt);
      agentRun = await this.createAgentRun(this.agentRunParams);
      if (agentRun.functions?.check_availabilities_for) {
        await this.deleteThreadRun();
      }
    } while (agentRun?.functions?.check_availabilities_for);

    return agentRun;
  }

  #todayIsoDate() {
    return new Date().toISOString().split('T')[0];
  }

  #weekDay() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
  }

  // FIXME: add the enduser timezone
  #scheduleDatetime() {
    const dateTime = `${this.answerData.schedule_appointment_year}-${this.answerData.schedule_appointment_month}-${this.answerData.schedule_appointment_day}T${this.answerData.schedule_appointment_time}:00:00`;
    try {
      return new Date(dateTime);
    } catch (error) {
      return undefined;
    }
  }

  // TODO: integrate with calendar service like Google Calendar
  #doctorAvailabilities(date) {
    if (date) { return `any time` }

    return `
    Every week:
      - Monday: none
      - Tuesday: 04:00 - 08:00
      - Wednesday: 08:00 - 12:00
      - Thursday: 12:00 - 16:00
      - Friday: 16:00 - 20:00
    `;
  }
}

module.exports = { MedicalSecretarySchedulerAgent }
