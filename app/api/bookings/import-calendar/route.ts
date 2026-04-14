export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readConfig } from '@/lib/config'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ical = require('node-ical')

const NAME_ALIASES: Record<string, string> = {
  'vinnie':  'Vinny',
  'whiskey': 'Royski',
  'lilly':   'Lilly',
  'lily':    'Lilly',
}

function cleanDogName(name: string): string {
  return name.replace(/\s*\(.*/, '').trim()
}

function parseVisitType(summary: string, dogNames: string[]): { visitType: 'Boarding' | 'Daycare' | 'Boarding Trial' | 'Daycare Trial'; dogName: string } | null {
  if (/^boarding trial:/i.test(summary))  return { visitType: 'Boarding Trial', dogName: cleanDogName(summary.slice(16)) }
  if (/^daycare trial:/i.test(summary))   return { visitType: 'Daycare Trial',  dogName: cleanDogName(summary.slice(14)) }
  if (/^trial daycare:/i.test(summary))   return { visitType: 'Daycare Trial',  dogName: cleanDogName(summary.slice(14)) }
  if (/^boarding:/i.test(summary))        return { visitType: 'Boarding',        dogName: cleanDogName(summary.slice(9)) }
  if (/^daycare:/i.test(summary))         return { visitType: 'Daycare',         dogName: cleanDogName(summary.slice(8)) }
  if (/^day boarding:/i.test(summary))    return { visitType: 'Daycare',         dogName: cleanDogName(summary.slice(13)) }

  const s = summary.toLowerCase().trim()
  const nameMap: Record<string, string> = {}
  for (const name of dogNames) nameMap[name.toLowerCase().trim()] = name
  for (const [alias, canonical] of Object.entries(NAME_ALIASES)) nameMap[alias] = canonical

  for (const [lower, canonical] of Object.entries(nameMap)) {
    if (!s.startsWith(lower)) continue
    const rest = s.slice(lower.length).trim()
    if (/^boarding trial/.test(rest))            return { visitType: 'Boarding Trial', dogName: canonical }
    if (/^overnight trial/.test(rest))           return { visitType: 'Boarding Trial', dogName: canonical }
    if (/^(daycare trial|trial day)/.test(rest)) return { visitType: 'Daycare Trial',  dogName: canonical }
    if (/^boarding/.test(rest))                  return { visitType: 'Boarding',        dogName: canonical }
    if (/^day(care| care| boarding)/.test(rest)) return { visitType: 'Daycare',         dogName: canonical }
  }
  return null
}

function toUKTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false })
}

function toDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) // YYYY-MM-DD
}

function isAllDay(date: Date): boolean {
  const t = toUKTime(date)
  return t === '00:00'
}

interface PreviewEvent {
  uid: string
  summary: string
  dogName: string
  dogId: number | null
  visitType: string
  startDate: string
  endDate: string
  dropOffTime: string | null
  pickUpTime: string | null
  status: 'ready' | 'duplicate' | 'unmatched'
  duplicateReason?: string
}

async function buildPreview(): Promise<PreviewEvent[]> {
  const config = readConfig()
  if (!config.calendarUrl) throw new Error('No calendar URL configured')

  const rawEvents = await ical.async.fromURL(config.calendarUrl)
  const dogs = await prisma.dog.findMany({ select: { id: true, name: true } })
  const dogNames = dogs.map(d => d.name)
  const today = new Date()
  today.setHours(23, 59, 59, 999)

  // Load existing bookings for duplicate detection
  const existingBookings = await prisma.booking.findMany({
    select: { dog_name: true, start_date: true, booking_type: true },
  })
  const existingSet = new Set(
    existingBookings.map(b => `${b.dog_name.toLowerCase().trim()}|${b.start_date}|${b.booking_type}`)
  )

  const events: PreviewEvent[] = []

  for (const event of Object.values(rawEvents) as Record<string, unknown>[]) {
    if ((event as { type: string }).type !== 'VEVENT') continue
    const summary = String((event as { summary?: string }).summary || '').trim()
    const parsed = parseVisitType(summary, dogNames)
    if (!parsed) continue

    const startRaw = (event as { start: Date }).start
    const endRaw   = (event as { end: Date }).end
    if (!startRaw) continue

    const uid = String((event as { uid?: string }).uid || Math.random())
    const rrule = (event as { rrule?: { _rrule?: { between: (a: Date, b: Date, inc: boolean) => unknown[] } } }).rrule
    const matched = dogs.find(d => d.name.toLowerCase().trim() === parsed.dogName.toLowerCase().trim())

    const pushEvent = (start: Date, end: Date, occUid: string) => {
      const allDay = isAllDay(start)
      const startDate = toDateStr(start)
      const endDate   = toDateStr(end)
      const dropOffTime = allDay ? null : toUKTime(start)
      const pickUpTime  = allDay ? null : toUKTime(end)

      const key = `${parsed.dogName.toLowerCase().trim()}|${startDate}|${parsed.visitType === 'Boarding' ? 'Boarding' : 'Daycare'}`
      const isDuplicate = existingSet.has(key)

      events.push({
        uid: occUid,
        summary,
        dogName: parsed.dogName,
        dogId: matched?.id ?? null,
        visitType: parsed.visitType,
        startDate,
        endDate,
        dropOffTime,
        pickUpTime,
        status: !matched ? 'unmatched' : isDuplicate ? 'duplicate' : 'ready',
        duplicateReason: isDuplicate ? 'Booking already exists for this dog on this date' : undefined,
      })
    }

    if (rrule?._rrule?.between) {
      // Recurring — past occurrences only
      const windowStart = new Date(); windowStart.setFullYear(windowStart.getFullYear() - 3)
      const duration = endRaw instanceof Date && startRaw instanceof Date
        ? endRaw.getTime() - startRaw.getTime() : 86400000
      const occurrences = rrule._rrule.between(windowStart, today, true)
      for (const occ of occurrences) {
        const occIso = String(occ).split('[')[0]
        const occStart = new Date(occIso)
        const occEnd   = new Date(occStart.getTime() + duration)
        pushEvent(occStart, occEnd, `${uid}-${occStart.toISOString()}`)
      }
    } else {
      // Single event — all occurrences
      const start = startRaw instanceof Date ? startRaw : new Date(String(startRaw))
      const end   = endRaw   instanceof Date ? endRaw   : new Date(String(endRaw))
      pushEvent(start, end, uid)
    }
  }

  return events.sort((a, b) => a.startDate.localeCompare(b.startDate))
}

// GET — preview only
export async function GET() {
  try {
    const events = await buildPreview()
    const ready     = events.filter(e => e.status === 'ready').length
    const duplicate = events.filter(e => e.status === 'duplicate').length
    const unmatched = events.filter(e => e.status === 'unmatched')
    return NextResponse.json({ events, ready, duplicate, unmatched: unmatched.length, unmatchedNames: [...new Set(unmatched.map(e => e.dogName))] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — do the import
export async function POST(req: NextRequest) {
  try {
    const { confirmed } = await req.json()
    if (!confirmed) return NextResponse.json({ error: 'Not confirmed' }, { status: 400 })

    const events = await buildPreview()
    const toImport = events.filter(e => e.status === 'ready')

    let imported = 0
    for (const e of toImport) {
      const bookingType = e.visitType.startsWith('Boarding') ? 'Boarding' : 'Daycare'
      await prisma.booking.create({
        data: {
          dog_name:      e.dogName,
          booking_type:  bookingType,
          start_date:    e.startDate,
          end_date:      e.endDate,
          drop_off_time: e.dropOffTime,
          pick_up_time:  e.pickUpTime,
          status:        'Confirmed',
          ...(e.dogId ? { dog: { connect: { id: e.dogId } } } : {}),
        },
      })
      imported++
    }

    return NextResponse.json({ imported, skipped: events.filter(e => e.status === 'duplicate').length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
