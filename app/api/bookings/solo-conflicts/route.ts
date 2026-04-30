export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nonRecurringOverlaps, coveredWeekdays, recurringConflicts } from '@/lib/solo-conflicts'

// GET /api/bookings/solo-conflicts?dogId=X&start=Y&end=Z
// Returns any Solo dogs already booked on overlapping dates (excluding the dog being booked).
// Also handles recurring bookings — if bookingId is provided, it's excluded from the check (for edits).
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const dogId = searchParams.get('dogId')
  const start = searchParams.get('start')
  const end   = searchParams.get('end') ?? start
  const excludeBookingId = searchParams.get('excludeBookingId')

  if (!start) return NextResponse.json([])

  // Find all Solo dogs that aren't the one being booked
  const soloDogs = await prisma.dog.findMany({
    where: {
      is_solo: true,
      ...(dogId ? { id: { not: parseInt(dogId) } } : {}),
    },
    select: { id: true, name: true },
  })

  if (soloDogs.length === 0) return NextResponse.json([])

  const conflicts: { dogName: string }[] = []

  for (const dog of soloDogs) {
    // Check non-recurring bookings overlapping the date range
    const nonRecurring = await prisma.booking.findFirst({
      where: {
        dog_id: dog.id,
        status: 'Confirmed',
        is_recurring: false,
        start_date: { lte: end! },
        OR: [
          { end_date: { gte: start } },
          { end_date: null, start_date: { gte: start } },
        ],
        ...(excludeBookingId ? { id: { not: parseInt(excludeBookingId) } } : {}),
      },
    })

    if (nonRecurring) {
      conflicts.push({ dogName: dog.name })
      continue
    }

    // Check recurring bookings — conflict if any occurrence falls within the date range
    const recurringBookings = await prisma.booking.findMany({
      where: {
        dog_id: dog.id,
        status: 'Confirmed',
        is_recurring: true,
        ...(excludeBookingId ? { id: { not: parseInt(excludeBookingId) } } : {}),
      },
      select: { day_of_week: true },
    })

    if (recurringConflicts(recurringBookings, start, end!)) {
      conflicts.push({ dogName: dog.name })
    }
  }

  return NextResponse.json(conflicts)
}
