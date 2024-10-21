const { google } = require("googleapis");

function authenticate() {
  const credentials = require('#/credentials/google-calendar-credentials.json');

  return new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
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

module.exports = {
  getBusyTimes,
};
