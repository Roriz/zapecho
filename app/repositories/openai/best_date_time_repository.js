
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
      "date_time": "YYYY-MM-DD HH:MM",
    },
    {
      "rank": 2,
      "reason": "Reason for this being the second-best choice based on the criteria."
      "date_time": "YYYY-MM-DD HH:MM",
    },
    {
      "rank": 3,
      "reason": "Reason for this being the third-best choice based on the criteria."
      "date_time": "YYYY-MM-DD HH:MM",
    }
  ]
}
\`\`\`
`;

module.exports = {
  bestDateTimeRepository: async function bestDateTimeRepository(possibleDates, requirements = undefined) {
    const today = new Date().toISOString().split('T')[0]
    const weekDay = new Date().toLocaleDateString('en-US', { weekday: 'long' })

    const messages = [
      { role: 'system', content: PROMPT },
      {
        role: 'user',
        content: `
        ## Additional Information
        Act like today is ${today} (${weekDay})

        ## Should be better if
        ${(requirements || []).map(requirement => `- ${requirement}`).join('\n')}

        ## Available Dates
        ${possibleDates.map(isoDate => {
          const [date, time] = isoDate.toISOString().split('T');
          const [hour, minute] = time.split(':');
          const weekDay = isoDate.toLocaleDateString('en-US', { weekday: 'long' });
          return `- ${date} ${hour}:${minute} (${weekDay})`
        }).join('\n')}
        `
      }
    ]

    const response = await completionCall(messages);

    console.debug('[bestDateTimeRepository] response', JSON.stringify(response, null, 2));
    return response.top_3_dates.map(d => {
      const weekDay = new Date(d.date_time).toLocaleDateString('en-US', { weekday: 'long' });
      return `${d.date_time} (${weekDay})`
    });
  }
}
