# TODO
- Conselho de revisão da mensagem
- remove sensive data using local NLP
- produtos ou servico
- Envio de arquivos
- CRM - mensagem antes do evento relembrando - confirmando
- coletar dados do paciente antes do agendamento
- mandar mensagem para o medico perguntando coisas
- reshedule agent
- unify base agent into AgentEngine
- create workflow to support more than 1 product to 1 schedule (like sales products or services)
- create workflow to support 1 product to multiple schedules (medical clinic with mutiple medics with same product or barber shop)
- unify slots interface
- rename agentRun to threadRun

## Agent
Agent is a autonomous entity that can perform actions on behalf of a user. Agents are small tasks resolver like discover the user intent or find the best date and time. Agents are the building blocks of the workflow.

### Glossary
workflow - seguequence of agents with a specific goal, E.g. medical secretary, sales
agent - a small task resolver, E.g. find the best date and time, discover the user intent
client - a person or company that buy the service
user - a person that use the service, usually is a client of the client
assistant - a persona that describe how the best way to interact with the user. Also give more context about the client.
guard_rails - a set of rules to block or filter topics that are not allowed to be discussed
message - a text/image/file that is sent or received by the user

### Use cases
receive_message -> save message -> get workflow -> exec guard_rails -> run thread + agent -> run critic agent -> send best response

### Agent run
Is the output of the agent, usually a message, function or a variable. A agent run is not restricted to a LLM model, it can be a bussiness rule, a function, a static message, ML model, etc. There is no restriction on how the agent run is implemented.

## template_messages
For LLM agent runs, the message must be a template message. The template message is a message with placeholders that will be replaced by the real values before sending the final message to the user.
E.g. "Hello, my name is {{assistant_name}}" -> "Hello, my name is John"

best practices:
- Can't be too much variables or function, should be always less than 10
- Functions is not consistent to complex arguments like enums, lists, etc
- Ideally, functions should return something to the text with value for the message.
