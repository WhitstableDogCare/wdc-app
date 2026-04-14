export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function esc(val: string | null | undefined): string {
  if (!val) return ''
  // Wrap in quotes and escape any quotes inside
  return `"${String(val).replace(/"/g, '""')}"`
}

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: { start_date: 'desc' },
    })

    const headers = [
      'Dog Name', 'Owner Name', 'Booking Type', 'Start Date', 'End Date',
      'Drop-off Time', 'Pick-up Time', 'Notes', 'Created At',
    ]

    const rows = bookings.map((b) => [
      esc(b.dog_name),
      esc(b.owner_name),
      esc(b.booking_type),
      esc(b.start_date),
      esc(b.end_date),
      esc(b.drop_off_time),
      esc(b.pick_up_time),
      esc(b.notes),
      esc(b.created_at.toISOString()),
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const date = new Date().toISOString().split('T')[0]

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="wdc-bookings-${date}.csv"`,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
