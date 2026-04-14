export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncPublicCalendarDays } from '@/lib/public-calendar'

// DELETE /api/unavailable-periods/[id]
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await prisma.unavailablePeriod.findUnique({ where: { id: parseInt(id) } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.unavailablePeriod.delete({ where: { id: parseInt(id) } })

  // Recalculate public calendar for the deleted period's range (non-blocking)
  syncPublicCalendarDays(existing.start_date, existing.end_date).catch(e =>
    console.error('Public calendar sync error:', e)
  )

  return NextResponse.json({ success: true })
}
