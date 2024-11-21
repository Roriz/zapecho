const { BaseAgent } = require('~/agents/base_agent.js');
const Threads = require('~/models/thread.js');

const BASE_PROMPT = `
You are a medical secretary responsible for managing and responding to the clinic's digital communication channel. Your role is to craft template messages that effectively convert potential patients into actual patients or enhance their patient experience.

# Patient Journey
The patient is currently in the early stages of their journey. Your objective is to smoothly guide them through the initial stages of the conversation until they are classified as a potential patient.
Use the suggested sequence below as a guide for your conversation. However, feel free to adapt your approach based on the context and patient's responses to ensure a natural, empathetic flow.

# Suggested Steps
1. **discover_if_could_potentially_be_treated**: Ask open-ended questions to help determine their symptoms without overwhelming them.
   - Gather enough information to offer direction without making patients feel they need to self-diagnose.
2. **discover_is_life_threatening**: Make sure to clarify the urgency of their symptoms in a sensitive manner.
3. **schedule_appointment**: Once enough information has been gathered, proceed with scheduling.
- Use the prebuilt add-on: {{ go_to_schedule_appointment() }}
`

class MedicalSecretaryInboundAgent extends BaseAgent {
  async run() {
    await super.run();

    if (this.#agentCompleted()) { return this.goToStatus('schedule_appointment'); }

    if (!this.workflowUser.current_step) {
      this.workflowUser = await Threads().updateOne(this.workflowUser, { current_step: 'greet_patient' });
    }
    
    if (this.workflowUser.current_step_messages_count >= 1) {
      const oldAnswerData = this.answerData;
      this.workflowUser = await this.extractData(this.#step?.dataToExtract);
      const newAnswerData = this.answerData;

      if (oldAnswerData !== newAnswerData) {
        this.workflowUser = await this.#nextStep();
        return MedicalSecretaryRecepcionistAgent.run(this.workflowUser);
      }
    }

    if ('could_potentially_be_treated' in this.answerData && !this.answerData.could_potentially_be_treated) { return this.goToStatus('not_icp'); }
    if (this.answerData.is_life_threatening) { return this.goToStatus('too_urgent'); }

    const agentRun = await this.threadRun(this.#prompt());

    if (agentRun.functions?.go_to_schedule_appointment) {
      return this.goToStatus('schedule_appointment');
    }

    if (agentRun.functions?.save_data) {
      this.workflowUser = await this.workflowUser.addAnswerData(agentRun.functions?.save_data.arguments);
      await this.deleteThreadRun();
      this.workflowUser = await this.#nextStep();
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

  async #nextStep() {
    let nextStep = 'discover_if_could_potentially_be_treated';
    if (this.answerData.could_potentially_be_treated) {
      nextStep = 'discover_is_life_threatening';
    }

    return await Threads().updateOne(this.workflowUser, { current_step: nextStep });
  }

  #prompt() {
    return `${BASE_PROMPT}
# Addons available:
${this.#saveDataAddonPrompt()}

#### addon {{ go_to_schedule_appointment() }}
Send the patient to the next step to schedule an appointment.
Call this addon when you have confidence that pass through all suggested steps.

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
    return this.answerData.could_potentially_be_treated &&
      ('is_life_threatening' in this.answerData && !this.answerData.is_life_threatening);
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
      discover_if_could_potentially_be_treated: {
        objective: `You are on step discover_if_could_potentially_be_treated. Focus on determining the doctor with the specialities: ${this.client.metadata?.specialities?.join(', ') || 'general medicine'} that can treat the patient's in any level. Once you have 95% confidence about the speciality, call the addon {{ save_data(could_potentially_be_treated: boolean) }}`,
        dataToExtract: { 
          could_potentially_be_treated: {
            type: 'boolean',
            description: `The patient's symptoms could potentially be treated by any of specialities: ${this.client.metadata?.specialities.join(', ')}.`
          }
        }
      },
      discover_is_life_threatening: {
        objective: `You are on step discover_is_life_threatening. Focus on assessing the patient's symptoms and determining if they are life-threatening. Once you have 95% confidence about the urgency, call the addon {{ save_data(is_life_threatening: boolean) }}`,
        dataToExtract: { 
          is_life_threatening: {
            type: 'boolean',
            description: `The patient's symptoms are life-threatening.`
          }
        }
      }
    }
  }
}

module.exports = { MedicalSecretaryInboundAgent }
