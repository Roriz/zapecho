const { google } = require("googleapis");

function authenticate() {
  const credentials = require('#/credentials/google-calendar-credentials.json');

  return new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });
}

// info: https://console.cloud.google.com/apis/credentials?hl=pt-br&project=zapecho
function OAuth2Client(redirectParams = {}) {
  const credentials = require('#/credentials/google-calendar-credentials-v2.json');
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  const url = new URL(redirect_uris[0]);
  const params = new URLSearchParams(redirectParams);
  url.search = url.search ? `${url.search}&${params.toString()}` : params.toString();
  const redirect_uri = url.toString();

  return new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uri,    
  );
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
  const oauth2Client = OAuth2Client();
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });

  return res.data;
}

function linkToAuth(redirectParams) {
  const oauth2Client = OAuth2Client(redirectParams);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar']
  });

  return authUrl;
}

async function handleCallback(code) {
  const oauth2Client = OAuth2Client();
  
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  return tokens;
}

module.exports = {
  getBusyTimes,
  createEvent,
  linkToAuth,
  handleCallback,
};
