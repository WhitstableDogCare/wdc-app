export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { syncPublicCalendarDays } from '@/lib/public-calendar'
import { readConfig } from '@/lib/config'

// POST /api/public-calendar/sync
// Syncs all days from today through the next 180 days to the public calendar.
export async function POST() {
  const config = readConfig()
  if (!config.publicGoogleCalendarId) {
    return NextResponse.json({ error: 'No public Google Calendar ID configured.' }, { status: 400 })
  }

  const today = new Date()
  const startDate = today.toISOString().split('T')[0]
  const endDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  await syncPublicCalendarDays(startDate, endDate)

  return NextResponse.json({ success: true, startDate, endDate })
}
