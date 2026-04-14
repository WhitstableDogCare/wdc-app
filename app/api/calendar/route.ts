export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { readConfig } from '@/lib/config'
import { prisma } from '@/lib/prisma'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ical = require('node-ical')

export interface CalendarEvent {
  uid: string
  summary: string
  visitType: 'Boarding' | 'Daycare' | 'Boarding Trial' | 'Daycare Trial'
  dogName: string
  dogId: number | null
  start: string
  end: string
  allDay: boolean
}

// Maps lowercase aliases → canonical DB name
const NAME_ALIASES: Record<string, string> = {
  'vinnie':  'Vinny',
  'whiskey': 'Royski',
  'lilly':   'Lilly',
  'lily':    'Lilly',
}

// Strip trailing parentheticals e.g. "Vinny (timings tbd)" → "Vinny"
function cleanDogName(name: string): string {
  return name.replace(/\s*\(.*/, '').trim()
}

function isAllDay(date: Date): boolean {
  return date.toISOString().endsWith('T00:00:00.000Z') && date.getHours() === 0 && date.getMinutes() === 0
}

function parseVisitType(
  summary: string,
  dogNames: string[]
): { visitType: CalendarEvent['visitType']; dogName: string } | null {
  // ── 1. Current prefix formats ─────────────────────────────────────────────
  if (/^boarding trial:/i.test(summary))  return { visitType: 'Boarding Trial', dogName: cleanDogName(summary.slice(16)) }
  if (/^daycare trial:/i.test(summary))   return { visitType: 'Daycare Trial',  dogName: cleanDogName(summary.slice(14)) }
  if (/^trial daycare:/i.test(summary))   return { visitType: 'Daycare Trial',  dogName: cleanDogName(summary.slice(14)) }
  if (/^boarding:/i.test(summary))        return { visitType: 'Boarding',        dogName: cleanDogName(summary.slice(9)) }
  if (/^daycare:/i.test(summary))         return { visitType: 'Daycare',         dogName: cleanDogName(summary.slice(8)) }
  if (/^day boarding:/i.test(summary))    return { visitType: 'Daycare',         dogName: cleanDogName(summary.slice(13)) }

  // ── 2. Legacy suffix formats: "{Dog name} boarding / daycare / …" ─────────
  const s = summary.toLowerCase().trim()

  // Build list of names to try: DB names + aliases (all lowercase → canonical)
  const nameMap: Record<string, string> = {}
  for (const name of dogNames) nameMap[name.toLowerCase().trim()] = name
  for (const [alias, canonical] of Object.entries(NAME_ALIASES)) nameMap[alias] = canonical

  for (const [lower, canonical] of Object.entries(nameMap)) {
    if (!s.startsWith(lower)) continue
    const rest = s.slice(lower.length).trim()

    if (/^boarding trial/.test(rest))           return { visitType: 'Boarding Trial', dogName: canonical }
    if (/^overnight trial/.test(rest))          return { visitType: 'Boarding Trial', dogName: canonical }
    if (/^(daycare trial|trial day)/.test(rest)) return { visitType: 'Daycare Trial',  dogName: canonical }
    if (/^boarding/.test(rest))                 return { visitType: 'Boarding',        dogName: canonical }
    if (/^day(care| care| boarding)/.test(rest)) return { visitType: 'Daycare',         dogName: canonical }
  }

  return null
}

export async function GET() {
  const config = readConfig()
  const calendarUrl = config.calendarUrl
  if (!calendarUrl) {
    return NextResponse.json({ error: 'No calendar URL configured' }, { status: 400 })
  }

  try {
    const rawEvents = await ical.async.fromURL(calendarUrl)
    const dogs = await prisma.dog.findMany({ select: { id: true, name: true } })
    const dogNames = dogs.map(d => d.name)

    const bookings: CalendarEvent[] = []

    // Expand recurring events within this window
    const windowStart = new Date(); windowStart.setFullYear(windowStart.getFullYear() - 1)
    const windowEnd   = new Date(); windowEnd.setFullYear(windowEnd.getFullYear() + 1)

    for (const event of Object.values(rawEvents) as Record<string, unknown>[]) {
      if ((event as { type: string }).type !== 'VEVENT') continue
      const summary = String((event as { summary?: string }).summary || '').trim()

      const parsed = parseVisitType(summary, dogNames)
      if (!parsed) continue

      const start = (event as { start: Date }).start
      const end = (event as { end: Date }).end
      if (!start) continue

      const matched = dogs.find(d =>
        d.name.toLowerCase().trim() === parsed.dogName.toLowerCase().trim()
      )

      const uid = String((event as { uid?: string }).uid || Math.random())
      const rrule = (event as { rrule?: { _rrule?: { between: (a: Date, b: Date, inc: boolean) => unknown[] } } }).rrule

      if (rrule?._rrule?.between) {
        // Recurring event — expand occurrences
        const duration = end instanceof Date && start instanceof Date
          ? end.getTime() - start.getTime()
          : 86400000
        const occurrences = rrule._rrule.between(windowStart, windowEnd, true)
        for (const occ of occurrences) {
          // Occurrences are Temporal.ZonedDateTime — convert via string
          const occIso = String(occ).split('[')[0] // "2026-03-26T08:30:00+00:00"
          const occStart = new Date(occIso)
          const occEnd = new Date(occStart.getTime() + duration)
          bookings.push({
            uid: `${uid}-${occStart.toISOString()}`,
            summary,
            visitType: parsed.visitType,
            dogName: parsed.dogName,
            dogId: matched?.id ?? null,
            start: occStart.toISOString(),
            end: occEnd.toISOString(),
            allDay: start instanceof Date ? isAllDay(start) : true,
          })
        }
      } else {
        // Single event
        bookings.push({
          uid,
          summary,
          visitType: parsed.visitType,
          dogName: parsed.dogName,
          dogId: matched?.id ?? null,
          start: start instanceof Date ? start.toISOString() : String(start),
          end: end instanceof Date ? end.toISOString() : (start instanceof Date ? start.toISOString() : String(start)),
          allDay: start instanceof Date ? isAllDay(start) : true,
        })
      }
    }

    bookings.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    return NextResponse.json(bookings)
  } catch (err) {
    console.error('Calendar fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 })
  }
}
