export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncPublicCalendarDays } from '@/lib/public-calendar'

const VALID_REASONS = ['Holiday', 'Illness', 'Personal', 'Other']

// GET /api/unavailable-periods
export async function GET() {
  const periods = await prisma.unavailablePeriod.findMany({
    orderBy: { start_date: 'asc' },
  })
  return NextResponse.json(periods)
}

// POST /api/unavailable-periods
export async function POST(req: NextRequest) {
  const { startDate, endDate, reason } = await req.json()

  if (!startDate || !endDate || !reason) {
    return NextResponse.json({ error: 'startDate, endDate and reason are required.' }, { status: 400 })
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: 'End date must be on or after start date.' }, { status: 400 })
  }
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: `reason must be one of: ${VALID_REASONS.join(', ')}` }, { status: 400 })
  }

  // Check for overlapping confirmed bookings (warn only — do not block)
  const overlapping = await prisma.booking.findMany({
    where: {
      status: 'Confirmed',
      is_recurring: false,
      start_date: { lte: endDate },
      OR: [
        { end_date: { gte: startDate } },
        { end_date: null, start_date: { gte: startDate } },
      ],
    },
    select: { id: true, dog_name: true, start_date: true, end_date: true },
  })

  const period = await prisma.unavailablePeriod.create({
    data: { start_date: startDate, end_date: endDate, reason },
  })

  // Sync public calendar for this date range (non-blocking)
  syncPublicCalendarDays(startDate, endDate).catch(e =>
    console.error('Public calendar sync error:', e)
  )

  return NextResponse.json({ ...period, overlappingBookings: overlapping })
}
