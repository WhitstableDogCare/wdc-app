export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar'
import { syncPublicCalendarDays } from '@/lib/public-calendar'

// GET /api/bookings/[id]
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const booking = await prisma.booking.findUnique({
    where: { id: parseInt(id) },
    include: {
      dog: { select: { id: true, name: true, photo_path: true } },
      invoice: { select: { id: true, invoice_number: true, status: true, total: true } },
    },
  })
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(booking)
}

// PUT /api/bookings/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const existing = await prisma.booking.findUnique({ where: { id: parseInt(id) } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isRecurring = body.isRecurring ?? existing.is_recurring

  // Check if this booking has a linked invoice (flag it if so)
  const linkedInvoice = await prisma.invoice.findUnique({ where: { booking_id: parseInt(id) } })
  const shouldFlag = !!linkedInvoice

  const updated = await prisma.booking.update({
    where: { id: parseInt(id) },
    data: {
      dog_name: body.dogName ?? existing.dog_name,
      owner_name: body.ownerName ?? existing.owner_name,
      owner_email: body.ownerEmail ?? existing.owner_email,
      booking_type: body.bookingType ?? existing.booking_type,
      service_type: body.serviceType ?? existing.service_type,
      rate_type: body.rateType ?? existing.rate_type,
      start_date: body.startDate ?? existing.start_date,
      end_date: isRecurring ? null : (body.endDate ?? existing.end_date),
      drop_off_time: body.dropOffTime ?? existing.drop_off_time,
      pick_up_time: body.pickUpTime ?? existing.pick_up_time,
      notes: body.notes ?? existing.notes,
      status: body.status ?? existing.status,
      is_recurring: isRecurring,
      day_of_week: isRecurring ? (body.dayOfWeek ?? existing.day_of_week) : null,
      ...(shouldFlag ? { invoice_flagged: true } : {}),
    },
  })

  // Update calendar event if it exists
  if (existing.google_event_id) {
    await updateCalendarEvent(existing.google_event_id, {
      title: `${updated.booking_type}: ${updated.dog_name}`,
      startDate: updated.start_date,
      endDate: updated.end_date ?? updated.start_date,
      dropOffTime: updated.drop_off_time ?? undefined,
      pickUpTime: updated.pick_up_time ?? undefined,
    })
  }

  // Sync public calendar for old and new date ranges (non-blocking, non-recurring only)
  if (!updated.is_recurring) {
    const oldStart = existing.start_date
    const oldEnd = existing.end_date ?? existing.start_date
    const newStart = updated.start_date
    const newEnd = updated.end_date ?? updated.start_date
    syncPublicCalendarDays(oldStart, oldEnd).catch(e => console.error('Public calendar sync error:', e))
    if (newStart !== oldStart || newEnd !== oldEnd) {
      syncPublicCalendarDays(newStart, newEnd).catch(e => console.error('Public calendar sync error:', e))
    }
  }

  return NextResponse.json(updated)
}

// DELETE /api/bookings/[id] — cancels the booking
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await prisma.booking.findUnique({ where: { id: parseInt(id) } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (existing.google_event_id) {
    await deleteCalendarEvent(existing.google_event_id)
  }

  await prisma.booking.update({ where: { id: parseInt(id) }, data: { status: 'Cancelled' } })

  // Sync public calendar for this booking's date range (non-blocking, non-recurring only)
  if (!existing.is_recurring) {
    const syncEnd = existing.end_date ?? existing.start_date
    syncPublicCalendarDays(existing.start_date, syncEnd).catch(e =>
      console.error('Public calendar sync error:', e)
    )
  }

  return NextResponse.json({ success: true })
}
