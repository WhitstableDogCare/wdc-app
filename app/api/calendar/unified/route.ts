export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { readConfig } from '@/lib/config'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ical = require('node-ical')

export interface UnifiedEvent {
  id: string
  title: string
  start: string  // YYYY-MM-DD for all-day, ISO string for timed
  end: string
  isAllDay: boolean
  source: 'personal' | 'family'
}

export interface UnifiedTask {
  id: string
  title: string
  due: string | null  // YYYY-MM-DD, null = show under today
  tasklistId: string
}

function icalDateStr(d: Date): string {
  // Use UTC components for all-day dates to avoid timezone shifts
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function fetchIcalEvents(
  url: string,
  source: 'personal' | 'family',
  startDate: string,
  endDate: string
): Promise<UnifiedEvent[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawEvents = await ical.async.fromURL(url) as Record<string, any>
    const windowStart = new Date(startDate + 'T00:00:00Z')
    const windowEnd = new Date(endDate + 'T23:59:59Z')
    const events: UnifiedEvent[] = []

    for (const event of Object.values(rawEvents)) {
      if (event.type !== 'VEVENT' || !event.start) continue

      const eventStart: Date = event.start
      const eventEnd: Date = event.end ?? eventStart
      const allDay = !!(eventStart as unknown as { dateonly?: boolean }).dateonly

      if (eventStart > windowEnd || eventEnd < windowStart) continue

      events.push({
        id: String(event.uid ?? Math.random()),
        title: String(event.summary ?? '(No title)').trim(),
        start: allDay ? icalDateStr(eventStart) : eventStart.toISOString(),
        end: allDay ? icalDateStr(eventEnd) : eventEnd.toISOString(),
        isAllDay: allDay,
        source,
      })
    }

    return events.sort((a, b) => a.start.localeCompare(b.start))
  } catch (e) {
    console.error(`Failed to fetch ${source} iCal:`, e)
    return []
  }
}

async function fetchTasks(startDate: string, endDate: string): Promise<UnifiedTask[]> {
  try {
    const config = readConfig()
    if (!config.googleRefreshToken) return []

    const oauth2 = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      'http://localhost:3004/api/calendar/auth/callback'
    )
    oauth2.setCredentials({ refresh_token: config.googleRefreshToken })
    const tasksApi = google.tasks({ version: 'v1', auth: oauth2 })

    const listsRes = await tasksApi.tasklists.list({ maxResults: 20 })
    const lists = listsRes.data.items ?? []
    const allTasks: UnifiedTask[] = []

    for (const list of lists) {
      if (!list.id) continue
      try {
        const res = await tasksApi.tasks.list({
          tasklist: list.id,
          showCompleted: false,
          showHidden: false,
          maxResults: 100,
        })
        const tasks = (res.data.items ?? [])
          .filter(t => t.status !== 'completed')
          .map(t => ({
            id: String(t.id ?? Math.random()),
            title: String(t.title ?? '(No title)').trim(),
            due: t.due ? t.due.split('T')[0] : null,
            tasklistId: list.id!,
          }))
          // Include no-due-date tasks (shown under today) and tasks due in range
          .filter(t => !t.due || (t.due >= startDate && t.due <= endDate))
        allTasks.push(...tasks)
      } catch {
        // Skip task lists that fail
      }
    }

    return allTasks
  } catch (e) {
    console.error('Failed to fetch tasks:', e)
    return []
  }
}

export async function GET(req: NextRequest) {
  const config = readConfig()
  const { searchParams } = req.nextUrl
  const today = new Date().toISOString().split('T')[0]
  const in28Days = new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0]
  const startDate = searchParams.get('start') ?? today
  const endDate = searchParams.get('end') ?? in28Days

  const [personalEvents, familyEvents, tasks] = await Promise.all([
    config.personalCalendarIcalUrl
      ? fetchIcalEvents(config.personalCalendarIcalUrl, 'personal', startDate, endDate)
      : Promise.resolve([]),
    config.familyCalendarIcalUrl
      ? fetchIcalEvents(config.familyCalendarIcalUrl, 'family', startDate, endDate)
      : Promise.resolve([]),
    fetchTasks(startDate, endDate),
  ])

  return NextResponse.json({ personalEvents, familyEvents, tasks })
}
