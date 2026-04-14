import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createCalendarEvent, updateCalendarEvent, findCalendarEvent } from '@/lib/google-calendar'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const booking = await prisma.booking.findUnique({ where: { id: parseInt(id) } })
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const title = `${booking.booking_type}: ${booking.dog_name}`
  const endDate = booking.end_date ?? booking.start_date

  const eventId = await findCalendarEvent(title, booking.start_date, endDate)
  if (eventId) {
    await prisma.booking.update({ where: { id: booking.id }, data: { google_event_id: eventId } })
    return NextResponse.json({ found: true, google_event_id: eventId })
  }
  return NextResponse.json({ found: false })
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const booking = await prisma.booking.findUnique({ where: { id: parseInt(id) } })
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const title = `${booking.booking_type}: ${booking.dog_name}`
  const endDate = booking.end_date ?? booking.start_date

  let googleEventId = booking.google_event_id

  if (googleEventId) {
    await updateCalendarEvent(googleEventId, {
      title,
      startDate: booking.start_date,
      endDate,
      dropOffTime: booking.drop_off_time,
      pickUpTime: booking.pick_up_time,
      description: booking.notes ?? '',
    })
  } else {
    googleEventId = await createCalendarEvent({
      title,
      startDate: booking.start_date,
      endDate,
      dropOffTime: booking.drop_off_time,
      pickUpTime: booking.pick_up_time,
      description: booking.notes ?? '',
    })
    if (googleEventId) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { google_event_id: googleEventId },
      })
    }
  }

  if (!googleEventId) {
    return NextResponse.json({ error: 'Failed to sync with Google Calendar — check server logs' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, google_event_id: googleEventId })
}
