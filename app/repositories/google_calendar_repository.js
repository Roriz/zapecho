const { google } = require("googleapis");
const CalendarAuthsQuery = require('~/models/calendar_auth.js');

// info: https://console.cloud.google.com/apis/credentials?hl=pt-br&project=zapecho
async function OAuth2Client(clientId) {
  const credentials = require('#/credentials/google-calendar-credentials-v2.json');
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
  const redirect_uri = redirect_uris[0];

  const auth = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uri,
  );

  if (clientId) {
    const calendarAuth = await CalendarAuthsQuery().findOne({ client_id: clientId });

    auth.setCredentials(calendarAuth.token);
  }

  return auth;
}

async function getBusySlots(clientId, startDateTime, endDateTime) {
  const oauth2Client = await OAuth2Client(clientId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const calendarAuth = await CalendarAuthsQuery().findOne({ client_id: clientId });

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: startDateTime.toISOString(),
      timeMax: endDateTime.toISOString(),
      items: [{ id: calendarAuth.primary_calendar_id }]
    },
  });

  return (res.data.calendars[calendarAuth.primary_calendar_id].busy || []).map((busy) => ({
    start: new Date(busy.start),
    end: new Date(busy.end)
  }));
}

async function slotIsAvailable(clientId, startDateTime, endDateTime) {
  const busyTimes = await getBusySlots(clientId, startDateTime, endDateTime);

  return !busyTimes.length;
}

async function getPrimaryCalendarId(clientId) {
  const oauth2Client = await OAuth2Client(clientId);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const res = await calendar.calendarList.list();

  return res.data.items.find((item) => item.primary).id;
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
async function createEvent(event, clientId) {
  const oauth2Client = await OAuth2Client(clientId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const calendarAuth = await CalendarAuthsQuery().findOne({ client_id: clientId });

  const res = await calendar.events.insert({
    calendarId: calendarAuth.primary_calendar_id,
    requestBody: event,
  });

  return res.data;
}

async function linkToAuth() {
  const oauth2Client = await OAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent'
  });
}

async function codeToToken(code) {
  const oauth2Client = await OAuth2Client();
  
  const { tokens } = await oauth2Client.getToken(code);

  return tokens;
}

module.exports = {
  GoogleCalendarRepository: {
    getBusySlots,
    createEvent,
    linkToAuth,
    codeToToken,
    getPrimaryCalendarId,
    slotIsAvailable,
  }
};
