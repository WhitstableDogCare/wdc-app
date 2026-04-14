import { prisma } from './prisma'
import { readConfig } from './config'
import { clearPublicDayEvents, createPublicDayEvent } from './google-calendar'

const MAX_CAPACITY = 5

// Google Calendar event colorIds
const COLOR_GREEN = '2'   // Sage  — 3–5 spaces remaining
const COLOR_YELLOW = '5'  // Banana — 1–2 spaces remaining
const COLOR_RED = '10'    // Tomato — 0 spaces remaining (full)
const COLOR_GREY = '11'   // Graphite — unavailable

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function datesInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = []
  let current = startStr
  while (current <= endStr) {
    dates.push(current)
    current = addDays(current, 1)
  }
  return dates
}

async function syncOneDay(calendarId: string, date: string): Promise<void> {
  // Check if date falls in any unavailable period
  const unavailable = await prisma.unavailablePeriod.findFirst({
    where: { start_date: { lte: date }, end_date: { gte: date } },
  })

  // Count confirmed non-recurring bookings that include this day
  const bookings = await prisma.booking.findMany({
    where: {
      status: 'Confirmed',
      is_recurring: false,
      start_date: { lte: date },
      OR: [
        { end_date: { gte: date } },
        { end_date: null, start_date: { gte: date } },
      ],
    },
    select: { id: true },
  })
  const booked = bookings.length

  // Always clear existing events for this day first
  await clearPublicDayEvents(calendarId, date)

  if (unavailable) {
    await createPublicDayEvent(calendarId, date, 'Unavailable', unavailable.reason, COLOR_GREY)
    return
  }

  const spacesRemaining = MAX_CAPACITY - booked

  if (spacesRemaining <= 0) {
    await createPublicDayEvent(calendarId, date, 'Fully Booked', 'No spaces remaining', COLOR_RED)
  } else {
    const description = booked === 0
      ? `All ${MAX_CAPACITY} spaces available`
      : `${spacesRemaining} space${spacesRemaining === 1 ? '' : 's'} remaining`
    const colorId = spacesRemaining <= 2 ? COLOR_YELLOW : COLOR_GREEN
    await createPublicDayEvent(calendarId, date, 'Spaces Available', description, colorId)
  }
}

// Sync all days in the given date range to the public calendar.
// Silently no-ops if public calendar is not configured.
export async function syncPublicCalendarDays(startDate: string, endDate: string): Promise<void> {
  const config = readConfig()
  if (!config.publicGoogleCalendarId || !config.googleRefreshToken) return

  const calendarId = config.publicGoogleCalendarId
  const dates = datesInRange(startDate, endDate)

  // Run sequentially to avoid rate-limit issues
  for (const date of dates) {
    await syncOneDay(calendarId, date)
  }
}
