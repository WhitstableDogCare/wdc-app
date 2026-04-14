export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const start = searchParams.get('start')
  const end = searchParams.get('end') ?? start

  if (!start) return NextResponse.json({ count: 0 })

  const overlapping = await prisma.booking.findMany({
    where: {
      status: 'Confirmed',
      start_date: { lte: end! },
      OR: [
        { end_date: { gte: start } },
        { end_date: null, start_date: { gte: start } },
      ],
    },
  })

  return NextResponse.json({ count: overlapping.length })
}
