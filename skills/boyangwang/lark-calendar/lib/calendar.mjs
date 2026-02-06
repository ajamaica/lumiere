/**
 * Lark Calendar Event Operations
 */

import { larkApi } from './lark-api.mjs';
import { ensureBoyangIncluded, getDisplayName } from './employees.mjs';

// Default calendar ID (Claw calendar)
export const DEFAULT_CALENDAR_ID = 'feishu.cn_caF80RJxgGcbBGsQx64bCh@group.calendar.feishu.cn';

// Default timezone
export const DEFAULT_TIMEZONE = 'Asia/Singapore';

/**
 * Convert datetime string to Unix timestamp
 * @param {string} timeStr - Format: YYYY-MM-DD HH:MM:SS
 * @param {string} timezone - IANA timezone (e.g., Asia/Singapore)
 * @returns {number} - Unix timestamp in seconds
 */
export function datetimeToTimestamp(timeStr, timezone = DEFAULT_TIMEZONE) {
  // Parse the datetime string
  const [datePart, timePart] = timeStr.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = (timePart || '00:00:00').split(':').map(Number);
  
  // Create date in the specified timezone
  // JavaScript Date uses local time, so we need to handle timezone offset
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second || 0).padStart(2, '0')}`;
  
  // Use Intl to get the timezone offset
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Create a date object assuming the input is in the target timezone
  // We need to find the UTC equivalent
  const localDate = new Date(dateStr);
  
  // Get the offset for this timezone at this date
  const utcDate = new Date(localDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(localDate.toLocaleString('en-US', { timeZone: timezone }));
  const offset = utcDate - tzDate;
  
  // Adjust and return timestamp
  return Math.floor((localDate.getTime() + offset) / 1000);
}

/**
 * Convert Unix timestamp to datetime string
 * @param {number} timestamp - Unix timestamp in seconds
 * @param {string} timezone - IANA timezone
 * @returns {string} - Format: YYYY-MM-DD HH:MM:SS
 */
export function timestampToDatetime(timestamp, timezone = DEFAULT_TIMEZONE) {
  const date = new Date(timestamp * 1000);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const values = {};
  for (const part of parts) {
    values[part.type] = part.value;
  }
  
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

/**
 * Create a calendar event
 * @param {object} options
 * @param {string} options.title - Event title
 * @param {string} [options.description] - Event description
 * @param {string} options.startTime - Start time (YYYY-MM-DD HH:MM:SS)
 * @param {string} options.endTime - End time (YYYY-MM-DD HH:MM:SS)
 * @param {string[]} [options.attendeeIds] - Array of user_ids
 * @param {string} [options.location] - Event location
 * @param {string} [options.timezone] - IANA timezone
 * @param {string} [options.calendarId] - Calendar ID
 * @returns {object} - Created event data
 */
export async function createEvent({
  title,
  description = '',
  startTime,
  endTime,
  attendeeIds = [],
  location = '',
  timezone = DEFAULT_TIMEZONE,
  calendarId = DEFAULT_CALENDAR_ID
}) {
  // Always include Boyang
  const finalAttendeeIds = ensureBoyangIncluded(attendeeIds);
  
  // Convert times to timestamps
  const startTimestamp = datetimeToTimestamp(startTime, timezone);
  const endTimestamp = datetimeToTimestamp(endTime, timezone);
  
  // Build location params
  const locationParams = location ? { name: location } : null;
  
  // Create the event
  const eventData = await larkApi('POST', `/calendar/v4/calendars/${calendarId}/events`, {
    data: {
      summary: title,
      description: description,
      start_time: { timestamp: String(startTimestamp), timezone },
      end_time: { timestamp: String(endTimestamp), timezone },
      visibility: 'private',
      attendee_ability: 'can_modify_event',
      free_busy_status: 'busy',
      reminders: [],
      schemas: [],
      attachments: [],
      color: -1,
      recurrence: null,
      location: locationParams
    }
  });
  
  const event = eventData.event;
  
  // Add attendees if any
  let attendees = [];
  if (finalAttendeeIds.length > 0) {
    const attendeesData = await addEventAttendees(calendarId, event.event_id, finalAttendeeIds);
    attendees = attendeesData.attendees || [];
  }
  
  return {
    event,
    attendees,
    attendeeNames: attendees.map(a => a.display_name).join(', ')
  };
}

/**
 * Update a calendar event
 * @param {object} options
 * @param {string} options.eventId - Event ID
 * @param {string} [options.title] - Event title
 * @param {string} [options.description] - Event description
 * @param {string} [options.startTime] - Start time (YYYY-MM-DD HH:MM:SS)
 * @param {string} [options.endTime] - End time (YYYY-MM-DD HH:MM:SS)
 * @param {string} [options.location] - Event location
 * @param {string} [options.timezone] - IANA timezone
 * @param {string} [options.calendarId] - Calendar ID
 * @returns {object} - Updated event data
 */
export async function updateEvent({
  eventId,
  title,
  description,
  startTime,
  endTime,
  location,
  timezone = DEFAULT_TIMEZONE,
  calendarId = DEFAULT_CALENDAR_ID
}) {
  const updateData = {};
  
  if (title !== undefined) updateData.summary = title;
  if (description !== undefined) updateData.description = description;
  if (location !== undefined) updateData.location = location ? { name: location } : null;
  
  if (startTime) {
    const startTimestamp = datetimeToTimestamp(startTime, timezone);
    updateData.start_time = { timestamp: String(startTimestamp), timezone };
  }
  
  if (endTime) {
    const endTimestamp = datetimeToTimestamp(endTime, timezone);
    updateData.end_time = { timestamp: String(endTimestamp), timezone };
  }
  
  const result = await larkApi('PATCH', `/calendar/v4/calendars/${calendarId}/events/${eventId}`, {
    data: updateData
  });
  
  return result.event;
}

/**
 * Delete a calendar event
 * @param {string} eventId - Event ID
 * @param {string} [calendarId] - Calendar ID
 * @param {boolean} [notify] - Send notification to attendees
 * @returns {boolean} - Success
 */
export async function deleteEvent(eventId, calendarId = DEFAULT_CALENDAR_ID, notify = true) {
  await larkApi('DELETE', `/calendar/v4/calendars/${calendarId}/events/${eventId}`, {
    params: { need_notification: String(notify) }
  });
  return true;
}

/**
 * Add attendees to an event
 * @param {string} calendarId - Calendar ID
 * @param {string} eventId - Event ID
 * @param {string[]} userIds - Array of user_ids
 * @returns {object} - Attendees data
 */
export async function addEventAttendees(calendarId, eventId, userIds) {
  const attendees = userIds.map(userId => ({
    type: 'user',
    is_optional: true,
    user_id: userId
  }));
  
  return larkApi('POST', `/calendar/v4/calendars/${calendarId}/events/${eventId}/attendees`, {
    params: { user_id_type: 'user_id' },
    data: {
      attendees,
      need_notification: true
    }
  });
}

/**
 * Remove attendees from an event
 * @param {string} calendarId - Calendar ID
 * @param {string} eventId - Event ID
 * @param {string[]} userIds - Array of user_ids to remove
 * @returns {object} - Result
 */
export async function removeEventAttendees(calendarId, eventId, userIds) {
  const deleteIds = userIds.map(userId => ({
    type: 'user',
    is_optional: true,
    user_id: userId
  }));
  
  return larkApi('POST', `/calendar/v4/calendars/${calendarId}/events/${eventId}/attendees/batch_delete`, {
    params: { user_id_type: 'user_id' },
    data: {
      delete_ids: deleteIds,
      need_notification: true
    }
  });
}

/**
 * List events in a calendar
 * @param {object} options
 * @param {string} [options.calendarId] - Calendar ID
 * @param {string} [options.startTime] - Start of range (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
 * @param {string} [options.endTime] - End of range
 * @param {string} [options.timezone] - Timezone
 * @returns {object[]} - Array of events
 */
export async function listEvents({
  calendarId = DEFAULT_CALENDAR_ID,
  startTime,
  endTime,
  timezone = DEFAULT_TIMEZONE
} = {}) {
  // Default to next 7 days if not specified
  const now = new Date();
  if (!startTime) {
    startTime = now.toISOString().split('T')[0] + ' 00:00:00';
  } else if (!startTime.includes(' ')) {
    startTime += ' 00:00:00';
  }
  
  if (!endTime) {
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    endTime = weekLater.toISOString().split('T')[0] + ' 23:59:59';
  } else if (!endTime.includes(' ')) {
    endTime += ' 23:59:59';
  }
  
  const startTs = datetimeToTimestamp(startTime, timezone);
  const endTs = datetimeToTimestamp(endTime, timezone);
  
  const result = await larkApi('GET', `/calendar/v4/calendars/${calendarId}/events`, {
    params: {
      start_time: String(startTs),
      end_time: String(endTs),
      page_size: 50
    }
  });
  
  return result.items || [];
}

/**
 * Get a single event
 * @param {string} eventId - Event ID
 * @param {string} [calendarId] - Calendar ID
 * @returns {object} - Event data
 */
export async function getEvent(eventId, calendarId = DEFAULT_CALENDAR_ID) {
  const result = await larkApi('GET', `/calendar/v4/calendars/${calendarId}/events/${eventId}`);
  return result.event;
}
