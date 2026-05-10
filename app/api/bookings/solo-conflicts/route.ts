export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/bookings/solo-conflicts?dogId=X&start=Y&end=Z
// Returns any Solo dogs already booked on overlapping dates (excluding the dog being booked).
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const dogId = searchParams.get('dogId')
  const start = searchParams.get('start')
  const end   = searchParams.get('end') ?? start
  const excludeBookingId = searchParams.get('excludeBookingId')

  if (!start) return NextResponse.json([])

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
    const conflict = await prisma.booking.findFirst({
      where: {
        dog_id: dog.id,
        status: 'Confirmed',
        start_date: { lte: end! },
        OR: [
          { end_date: { gte: start } },
          { end_date: null, start_date: { gte: start } },
        ],
        ...(excludeBookingId ? { id: { not: parseInt(excludeBookingId) } } : {}),
      },
    })
    if (conflict) conflicts.push({ dogName: dog.name })
  }

  return NextResponse.json(conflicts)
}
