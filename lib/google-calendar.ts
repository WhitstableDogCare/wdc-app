import { google } from 'googleapis'
import { readConfig } from './config'

const REDIRECT_URI = 'http://localhost:3004/api/calendar/auth/callback'

function getAuth() {
  const config = readConfig()
  const oauth2 = new google.auth.OAuth2(config.googleClientId, config.googleClientSecret, REDIRECT_URI)
  oauth2.setCredentials({ refresh_token: config.googleRefreshToken })
  return oauth2
}

// Google all-day events use exclusive end dates — add 1 day to the end
function exclusiveEnd(date: string): string {
  const d = new Date(date)
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function buildEventTime(date: string, time?: string | null): { dateTime: string; timeZone: string } | { date: string } {
  if (time) {
    return { dateTime: `${date}T${time}:00`, timeZone: 'Europe/London' }
  }
  return { date }
}

export async function createCalendarEvent(params: {
  title: string
  startDate: string
  endDate: string
  dropOffTime?: string | null
  pickUpTime?: string | null
  description?: string
}): Promise<string | null> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: getAuth() })
    const start = buildEventTime(params.startDate, params.dropOffTime)
    const end = params.dropOffTime
      ? buildEventTime(params.endDate, params.pickUpTime)
      : { date: exclusiveEnd(params.endDate) }
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: params.title,
        description: params.description ?? '',
        start,
        end,
      },
    })
    return res.data.id ?? null
  } catch (e) {
    console.error('Google Calendar create error:', e)
    return null
  }
}

export async function updateCalendarEvent(eventId: string, params: {
  title: string
  startDate: string
  endDate: string
  dropOffTime?: string | null
  pickUpTime?: string | null
  description?: string
}): Promise<void> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: getAuth() })
    const start = buildEventTime(params.startDate, params.dropOffTime)
    const end = params.dropOffTime
      ? buildEventTime(params.endDate, params.pickUpTime)
      : { date: exclusiveEnd(params.endDate) }
    await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: {
        summary: params.title,
        description: params.description ?? '',
        start,
        end,
      },
    })
  } catch (e) {
    console.error('Google Calendar update error:', e)
  }
}

export async function findCalendarEvent(title: string, startDate: string, endDate: string): Promise<string | null> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: getAuth() })
    const res = await calendar.events.list({
      calendarId: 'primary',
      q: title,
      timeMin: new Date(startDate + 'T00:00:00').toISOString(),
      timeMax: new Date(endDate + 'T23:59:59').toISOString(),
      singleEvents: true,
    })
    const match = (res.data.items ?? []).find(e => e.summary === title)
    return match?.id ?? null
  } catch (e) {
    console.error('Google Calendar find error:', e)
    return null
  }
}

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

export async function createRecurringCalendarEvent(params: {
  title: string
  startDate: string
  dayOfWeek: number
  dropOffTime?: string | null
  pickUpTime?: string | null
  description?: string
}): Promise<string | null> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: getAuth() })
    const start = buildEventTime(params.startDate, params.dropOffTime)
    const end = params.dropOffTime
      ? buildEventTime(params.startDate, params.pickUpTime)
      : { date: exclusiveEnd(params.startDate) }
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: params.title,
        description: params.description ?? '',
        start,
        end,
        recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[params.dayOfWeek]}`],
      },
    })
    return res.data.id ?? null
  } catch (e) {
    console.error('Google Calendar recurring create error:', e)
    return null
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendar = google.calendar({ version: 'v3', auth: getAuth() })
  await calendar.events.delete({ calendarId: 'primary', eventId })
}

// --- Public calendar helpers ---

// Delete all past availability events from the public calendar (before today)
export async function deletePastPublicEvents(calendarId: string): Promise<void> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: getAuth() })
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const oneYearAgo = new Date(today)
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const res = await calendar.events.list({
      calendarId,
      timeMin: oneYearAgo.toISOString(),
      timeMax: today.toISOString(),
      singleEvents: true,
      maxResults: 2500,
    })

    const toDelete = (res.data.items ?? []).filter(
      e => e.summary === 'Spaces Available' || e.summary === 'Fully Booked' || e.summary === 'Unavailable'
    )

    for (const event of toDelete) {
      if (event.id) {
        await calendar.events.delete({ calendarId, eventId: event.id })
      }
    }

    if (toDelete.length > 0) {
      console.log(`[Public Calendar] Deleted ${toDelete.length} past event(s)`)
    }
  } catch (e) {
    console.error('Public calendar past event cleanup error:', e)
  }
}

// Delete any "Booked" or "Unavailable" all-day events on the given date from the public calendar
export async function clearPublicDayEvents(calendarId: string, date: string): Promise<void> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: getAuth() })
    const res = await calendar.events.list({
      calendarId,
      timeMin: new Date(date + 'T00:00:00').toISOString(),
      timeMax: new Date(date + 'T23:59:59').toISOString(),
      singleEvents: true,
    })
    const toDelete = (res.data.items ?? []).filter(
      e => e.start?.date === date && (e.summary === 'Spaces Available' || e.summary === 'Fully Booked' || e.summary === 'Unavailable')
    )
    for (const event of toDelete) {
      if (event.id) {
        await calendar.events.delete({ calendarId, eventId: event.id })
      }
    }
  } catch (e) {
    console.error('Public calendar clear error:', e)
  }
}

// Create a single all-day event on the public calendar
export async function createPublicDayEvent(
  calendarId: string,
  date: string,
  title: string,
  description: string,
  colorId: string
): Promise<void> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: getAuth() })
    await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: title,
        description,
        colorId,
        start: { date },
        end: { date: exclusiveEnd(date) },
      },
    })
  } catch (e) {
    console.error('Public calendar create error:', e)
  }
}
