const Clients = require('~/models/client.js');
const { GoogleCalendarRepository } = require('~/repositories/google_calendar_repository.js');
const { bestDateTimeRepository } = require('~/repositories/openai/best_date_time_repository.js');

function generateTimeSlots(startTime, endTime, slotDurationInMinutes) {
  const slots = [];
  let currentTime = startTime;
  while (currentTime < endTime) {
    const slotEndTime = new Date(currentTime.getTime() + slotDurationInMinutes * 60000);
    slots.push({
      start: currentTime,
      end: slotEndTime,
    });
    currentTime = slotEndTime;
  }
  return slots;
}

function filterAvailableSlots(allSlots, busySlots) {
  return allSlots.filter((slot) => {
    return !busySlots.some(
      (busy) => (slot.start >= busy.start && slot.start < busy.end) ||
        (slot.end > busy.start && slot.end <= busy.end)
    );
  });
}

// TODO: create feat to get start and end of day from client
function getStartAndEndOfDay(dateString) {
  const startOfDay = new Date(dateString);
  startOfDay.setHours(9, 0, 0, 0);
  const endOfDay = new Date(dateString);
  endOfDay.setHours(17, 59, 59, 999);
  return { startOfDay, endOfDay };
}

async function availableSlots(clientId, dateString, preferences) {
  const client = await Clients().findOne('id', clientId);
  const { startOfDay, endOfDay } = getStartAndEndOfDay(dateString);
  const slotDurationInMinutes = client.metadata?.appointment_duration || 60;

  const allSlots = generateTimeSlots(startOfDay, endOfDay, slotDurationInMinutes);
  const busySlots = await GoogleCalendarRepository.getBusySlots(client.id, startOfDay, endOfDay);
  console.debug(`[services/calendar/available_slots] allSlots: ${allSlots.length} busySlots: ${busySlots.length}`);
  console.debug(`[services/calendar/available_slots]`, { busySlots });
  const availableSlots = filterAvailableSlots(allSlots, busySlots);
  
  const bestDateTimes = await bestDateTimeRepository(availableSlots.map((slot) => slot.start), preferences);

  console.debug(`[services/calendar/available_slots] bestDateTimes: ${bestDateTimes.length}`);
  console.debug(`[services/calendar/available_slots]`, { bestDateTimes });
  return bestDateTimes;
}

module.exports = { availableSlots };
