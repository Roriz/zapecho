
const { completionCall } = require('~/repositories/openai_repository');

const PROMPT = `
You are provided with a list of date and time entries in the format \`YYYY-MM-DD HH:MM\`. Based on the following criteria, return the top 3 best date and time options in a structured JSON format, along with detailed reasoning for each choice.

### Input:
1. **Available Dates**: A list of dates and times in \`YYYY-MM-DD HH:MM\` format. All dates are in same timezone.
2. **Should be better if**: A list of possible requirements that the date and time should meet.

### Output:
Return the top 3 best date and time options in the following structured JSON format:

\`\`\`json
{
  "top_3_dates": [
    {
      "rank": 1,
      "reason": "Reason for this being the best choice based on the criteria."
      "dateTime": "YYYY-MM-DD HH:MM",
    },
    {
      "rank": 2,
      "reason": "Reason for this being the second-best choice based on the criteria."
      "dateTime": "YYYY-MM-DD HH:MM",
    },
    {
      "rank": 3,
      "reason": "Reason for this being the third-best choice based on the criteria."
      "dateTime": "YYYY-MM-DD HH:MM",
    }
  ]
}
\`\`\`
`;

const todayText = () => {
  const d = new Date();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const weekDay = d.toLocaleDateString('en-US', { weekday: 'long' });

  return `${date} ${hour}:${minute} (${weekDay})`;
}

module.exports = {
  bestDateTimeRepository: async function bestDateTimeRepository(possibleDates, requirements = undefined) {
    const messages = [
      { role: 'system', content: PROMPT },
      {
        role: 'user',
        content: `
        ## Additional Information
        Act like today is ${todayText()}

        ## Should be better if
        ${(Array.isArray(requirements) ? requirements : requirements ? [requirements] : []).map(requirement => `- ${requirement}`).join('\n')}

        ## Available Dates
        ${possibleDates.map(d => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const date = `${year}-${month}-${day}`;
          const hour = String(d.getHours()).padStart(2, '0');
          const minute = String(d.getMinutes()).padStart(2, '0');
          const weekDay = d.toLocaleDateString('en-US', { weekday: 'long' });

          return `- ${date} ${hour}:${minute} (${weekDay})`
        }).join('\n')}
        `
      }
    ]

    console.debug(`[repositories/openai/best_dateTime_repository] messages: ${messages.length}`);
    console.debug(`[repositories/openai/best_dateTime_repository] ${JSON.stringify(messages)}`);
    const response = await completionCall(messages);

    return response.top_3_dates.map(d => {
      const weekDay = new Date(d.dateTime).toLocaleDateString('en-US', { weekday: 'long' });
      return `${d.dateTime} (${weekDay})`
    });
  }
}
