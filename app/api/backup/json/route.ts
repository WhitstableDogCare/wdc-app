export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [dogs, bookings, invoices] = await Promise.all([
      prisma.dog.findMany({
        include: {
          owners: true,
          vets: true,
          buddies: true,
          trial_reviews: true,
          bookings: true,
          invoices: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.booking.findMany({ orderBy: { start_date: 'desc' } }),
      prisma.invoice.findMany({ orderBy: { created_at: 'desc' } }),
    ])

    const backup = {
      exported_at: new Date().toISOString(),
      version: 1,
      dogs,
      bookings,
      invoices,
    }

    const json = JSON.stringify(backup, null, 2)
    const date = new Date().toISOString().split('T')[0]

    return new Response(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="wdc-data-${date}.json"`,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
