const { google } = require("googleapis");

function authenticate() {
  const credentials = require('#/credentials/google-calendar-credentials.json');

  return new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });
}

async function getBusyTimes(startDateTime, endDateTime, calendarId) {
  const auth = await authenticate();
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: startDateTime.toISOString(),
      timeMax: endDateTime.toISOString(),
      items: [{ id: calendarId }],
    },
  });

  return (res.data.calendars[calendarId].busy || []).map((busy) => ({
    start: new Date(busy.start),
    end: new Date(busy.end)
  }));
}

// Event example:
// {
//   "summary": "Meeting with John",
//   "location": "John's office",
//   "description": "Meeting to discuss project",
//   "start": {
//     "dateTime": "2022-01-01T09:00:00",
//     "timeZone": "America/Sao_Paulo"
//   },
//   "end": {
//     "dateTime": "2022-01-01T10:00:00",
//     "timeZone": "America/Sao_Paulo"
//   },
//   "attendees": [
//     { "email": "example@email.com" }
//   ]
// }
async function createEvent(event, calendarId) {
  const auth = await authenticate();
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
  } catch (err) {
    console.error(err);
    console.error(err.response.data.error.errors);
    throw err;
  }

  return res.data;
}

module.exports = {
  getBusyTimes,
  createEvent,
};
