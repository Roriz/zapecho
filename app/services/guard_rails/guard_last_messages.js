const { functionCall, openaiFunctions } = require('~/repositories/openai_repository');

const CONVERSATION_PROMPT = `
Act as a content moderator and decide if the last messages are relevant to the conversation.
Be careful with litotes and sarcasm.
It's okay permit some off-topic or joke messages sometimes, but the conversation should return to the main topic.
`;

SCOPE_FUNCTION = {
  name: 'focus_on_conversation_score',
  description: 'Focus on the conversation score to decide if the conversation is relevant.',
  parameters: {
    type: 'object',
    properties: {
      conversation_score: {
        type: 'number',
        description: 'In a scale from 1 to 10, how relevant is the conversation. 1 is irrelevant and 10 is very relevant.'
      }
    }
  }
}

async function guardLastMessages(agent) {
  const lastRelevantMessages = await Messages().lastRelevantMessages(agent.thread.id);
  
  if (agent.moderationMessages()) {
    // TODO: use https://platform.openai.com/docs/guides/moderation
    // const moderation = await openaiModeration(lastRelevantMessages);
    // if (moderation.flagged) { return moderation }
  }

  if (agent.conversationScope()) {
    const messages = [
      {
        role: 'system',
        content: `${CONVERSATION_PROMPT}\n\nThe conversation should involve: ${agent.conversationScope()}`
      },
      ...openaiFunctions.convertMessagesToOpenai(lastRelevantMessages),
    ]
    
    const response = await functionCall(messages, SCOPE_FUNCTION, { temperature: 0 });

    if (response.conversation_score < 5) { return 'guardRails/low_conversation_score'; }
  }

  return;
}

module.exports = {
  guardRails: {
    guardLastMessages
  }
}
