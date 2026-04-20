export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/bookings/conflicts?dogId=X&start=Y&end=Z
// Returns any conflicting dogs that are booked on overlapping dates.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const dogId = searchParams.get('dogId')
  const start = searchParams.get('start')
  const end = searchParams.get('end') ?? start

  if (!dogId || !start) return NextResponse.json([])

  const id = parseInt(dogId)

  // Fetch all dogs that conflict with this one (both relation directions)
  const [asdog1, asdog2] = await Promise.all([
    prisma.dogConflict.findMany({
      where: { dog_id_1: id },
      select: { dog_id_2: true, dog2: { select: { id: true, name: true } }, notes: true },
    }),
    prisma.dogConflict.findMany({
      where: { dog_id_2: id },
      select: { dog_id_1: true, dog1: { select: { id: true, name: true } }, notes: true },
    }),
  ])

  const conflictingDogs = [
    ...asdog1.map(c => ({ id: c.dog_id_2, name: c.dog2.name, notes: c.notes })),
    ...asdog2.map(c => ({ id: c.dog_id_1, name: c.dog1.name, notes: c.notes })),
  ]

  if (conflictingDogs.length === 0) return NextResponse.json([])

  // Check each conflicting dog for overlapping bookings
  const warnings: { dogName: string; notes: string | null }[] = []

  for (const dog of conflictingDogs) {
    const overlapping = await prisma.booking.findFirst({
      where: {
        dog_id: dog.id,
        status: 'Confirmed',
        start_date: { lte: end! },
        OR: [
          { end_date: { gte: start } },
          { end_date: null, start_date: { gte: start } },
        ],
      },
    })
    if (overlapping) {
      warnings.push({ dogName: dog.name, notes: dog.notes })
    }
  }

  return NextResponse.json(warnings)
}
