const { BaseAgent } = require('~/agents/base_agent.js');
const { bestDateTimeRepository } = require('~/repositories/openai/best_date_time_repository.js');

const DATA_TO_EXTRACT = {
  appointment_date_and_time: {
    type: 'number',
    description: 'The date and time the user wants to schedule the appointment. date and time entries in the format \`YYYY-MM-DD HH:MM\`'
  },
  appointment_date_and_time_has_been_confirmed: {
    type: 'boolean',
    description: 'The user confirms the appointment schedule date and time.',
  },
  appointment_requirements: {
    type: 'array',
    description: 'The user has any requirements for the appointment schedule date and time. E.g. "morning", "afternoon"',
    items: { type: 'string' }
  },
}
const WORKING_HOURS = [8, 12, 14, 18];

const BASE_PROMPT = `
**You are acting as a scheduler for a medical secretary.**

### **Your Role**:
- Match the user’s availability with the doctor’s schedule to book an appointment.
- Confirm the appointment date and time with the user in a formal, professional manner.

### **Suggested Steps**:
1. **Receive the doctor's next available appointment slots** (date and time) and suggest 2 to 3 options to the user.
   - Ensure the options cover different days and different times of the day (morning, afternoon, evening) to accommodate the user's preferences.
2. If the user declines the suggested times, **ask for their preferred date and time**. Use the function \`check_availabilities_for(iso_date: string)\` to check availability on the specific date provided by the user.
3. **Confirm the appointment** once a suitable date and time is agreed upon.

### **Functions**:
- \`check_availabilities_for(iso_date: string)\` - Use this function to check all available slots for a specific date. Ensure the date is in the format "YYYY-MM-DD".

### **Example Interaction**:

**user**: I'd like to book an appointment.  
**assistant**: Of course! The doctor’s closest available appointments are on $day1 at 10:00 AM, $day2 at 2:00 PM, or $day4 at 6:00 PM. Would any of these work for you?  
**user**: Those don’t work for me. Can I have an appointment next Friday?  
**assistant**: Let me check the available times for next Friday. {{ check_availabilities_for($requested_date) }}  
**assistant**: The doctor is available on Friday at 11:00 AM and 4:00 PM. Would either of these times be convenient?  
**user**: Yes, 11:00 AM works.  
**assistant**: Excellent! Your appointment is confirmed for $appointment_date at 11:00 AM. We look forward to seeing you.

### **Expected Happy Path**:
- **Current step**: Find and suggest suitable appointment times for the user.
- **Next step**: Start the payment process after confirming the appointment date and time.
`

class MedicalSecretarySchedulerAgent extends BaseAgent {
  async run() {
    await this.extractData(DATA_TO_EXTRACT);

    if (this.answerData.appointment_date_and_time_has_been_confirmed && this.#scheduleDatetime()) {
      return this.goToStatus('payment');
    }
    
    let agentRun = {}
    do {
      // FIXME: add the enduser timezone
      const prompt = `
      ${BASE_PROMPT}

      ## Best suggested appointment times
      ${this.#bestSuggestedAppointmentTimes().map(d => `- ${d}`).join('\n')}
      `

      this.agentRunParams = await this.threadRun(prompt);
      agentRun = await this.createAgentRun(this.agentRunParams);
      if (agentRun.functions?.check_availabilities_for) {
        // TODO: send a mensage to the patient like: "Let me check the available times for next Friday"
        await this.deleteThreadRun();
      }
    } while (agentRun?.functions?.check_availabilities_for);

    return agentRun;
  }

  async #bestSuggestedAppointmentTimes() {
    const doctorAvailabilities = this.#doctorAvailabilities(this.#scheduleDatetime());
    let requirements = this.answerData.user_schedule_appointment_requirements || [];
    
    const client = await this.client();
    requirements = [...requirements, client.metadata?.appointment_requirements || []];
    
    return bestDateTimeRepository(doctorAvailabilities, requirements);
  }

  // FIXME: add the enduser timezone
  #scheduleDatetime() {
    try {
      return new Date(this.answerData.appointment_date_and_time);
    } catch (error) {
      return undefined;
    }
  }

  // TODO: integrate with calendar service like Google Calendar
  #doctorAvailabilities() {
    return new Array(5).fill(0).map((_, i) => {
      const d = new Date();
      d.setDate(new Date().getDate() + i + 1)
      d.setHours(0);
      d.setMinutes(0);
      d.setSeconds(0);

      return WORKING_HOURS.map(h => {
        const dup_d = new Date(d.getTime());
        dup_d.setHours(h);
        return dup_d;
      });
    }).flat();
  }
}

module.exports = { MedicalSecretarySchedulerAgent }

