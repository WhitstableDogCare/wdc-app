export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createCalendarEvent, createRecurringCalendarEvent } from '@/lib/google-calendar'
import { readConfig } from '@/lib/config'
import { syncPublicCalendarDays } from '@/lib/public-calendar'
import nodemailer from 'nodemailer'
import path from 'path'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

async function sendConfirmation(booking: {
  owner_name: string | null
  owner_email: string | null
  dog_name: string
  booking_type: string
  start_date: string
  end_date: string | null
  drop_off_time: string | null
  pick_up_time: string | null
  notes: string | null
}) {
  if (!booking.owner_email) return false
  const config = readConfig()
  if (!config.gmailAppPassword || !config.businessEmail) return false

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.businessEmail, pass: config.gmailAppPassword },
  })

  const isBoarding = booking.booking_type.startsWith('Boarding')
  const isTrial    = booking.booking_type.includes('Trial')
  const fmt12 = (t: string | null) => {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'pm' : 'am'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')}${ampm}`
  }
  const dropStr = booking.drop_off_time ? ` at ${fmt12(booking.drop_off_time)}` : ''
  const pickStr = booking.pick_up_time  ? ` at ${fmt12(booking.pick_up_time)}`  : ''
  const dateStr = isBoarding
    ? `Drop-off: ${formatDate(booking.start_date)}${dropStr}<br/>Pick-up: ${formatDate(booking.end_date!)}${pickStr}`
    : `${formatDate(booking.start_date)}${dropStr}${pickStr ? ` – pick-up${pickStr}` : ''}`

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <img src="cid:logo" alt="Whitstable Dog Care" style="width:80px;margin-bottom:16px"/>
      <h2 style="color:#2d2d4e">${isTrial ? 'Trial Booking Confirmed' : 'Booking Confirmed'}</h2>
      <p>Hi ${booking.owner_name ?? 'there'},</p>
      <p>We're pleased to confirm the following ${isTrial ? 'trial ' : ''}booking for <strong>${booking.dog_name}</strong>:</p>
      ${isTrial ? `<p style="background:#f0f7ff;border-left:4px solid #4a90d9;padding:10px 14px;border-radius:4px;color:#2d4e7a">🔍 <strong>This is a trial visit.</strong> We'll observe ${booking.dog_name} throughout to ensure they're happy and comfortable with us.</p>` : ''}
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold;width:40%">Type</td><td style="padding:8px;background:#f9f9f9">${booking.booking_type}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Date${isBoarding ? 's' : ''}</td><td style="padding:8px">${dateStr}</td></tr>
        ${booking.notes ? `<tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">Notes</td><td style="padding:8px;background:#f9f9f9">${booking.notes}</td></tr>` : ''}
      </table>
      <p>If you have any questions please don't hesitate to get in touch.</p>
      <p>Many thanks,<br/><strong>${config.businessName ?? 'Whitstable Dog Care'}</strong><br/>${config.businessPhone ?? ''}</p>
    </div>
  `

  const logoPath = path.join(process.cwd(), 'public', 'wdc-logo.png')
  await transporter.sendMail({
    from: `"${config.businessName ?? 'Whitstable Dog Care'}" <${config.businessEmail}>`,
    to: booking.owner_email,
    subject: `${isTrial ? 'Trial ' : ''}Booking Confirmed — ${booking.dog_name} (${booking.booking_type})`,
    html,
    attachments: [{ filename: 'wdc-logo.png', path: logoPath, cid: 'logo' }],
  })
  return true
}

// GET /api/bookings
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const dogId = searchParams.get('dogId')

  const bookings = await prisma.booking.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(dogId ? { dog_id: parseInt(dogId) } : {}),
    },
    include: { dog: { select: { id: true, name: true, photo_path: true } } },
    orderBy: { start_date: 'asc' },
  })
  return NextResponse.json(bookings)
}

// POST /api/bookings
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { dogId, dogName, ownerName, ownerEmail, bookingType, startDate, endDate, dropOffTime, pickUpTime, notes, isRecurring, dayOfWeek, sendEmail } = body

  // Capacity check — max 5 confirmed bookings on any day in the range (skip for recurring)
  if (!isRecurring) {
    const checkStart = startDate
    const checkEnd = endDate ?? startDate
    const overlapping = await prisma.booking.findMany({
      where: {
        status: 'Confirmed',
        is_recurring: false,
        start_date: { lte: checkEnd },
        OR: [
          { end_date: { gte: checkStart } },
          { end_date: null, start_date: { gte: checkStart } },
        ],
      },
    })
    if (overlapping.length >= 5) {
      return NextResponse.json({ error: 'Capacity full — already 5 bookings on those dates.' }, { status: 409 })
    }
  }

  // Create calendar event
  const calTitle = `${bookingType}: ${dogName}`
  const calDesc = notes ?? ''
  let googleEventId: string | null = null
  if (isRecurring) {
    googleEventId = await createRecurringCalendarEvent({
      title: calTitle,
      startDate,
      dayOfWeek: dayOfWeek,
      dropOffTime: dropOffTime ?? null,
      pickUpTime: pickUpTime ?? null,
      description: calDesc,
    })
  } else {
    googleEventId = await createCalendarEvent({
      title: calTitle,
      startDate,
      endDate: endDate ?? startDate,
      dropOffTime: dropOffTime ?? null,
      pickUpTime: pickUpTime ?? null,
      description: calDesc,
    })
  }

  // Save booking
  const booking = await prisma.booking.create({
    data: {
      ...(dogId ? { dog: { connect: { id: dogId } } } : {}),
      dog_name: dogName,
      owner_name: ownerName ?? null,
      owner_email: ownerEmail ?? null,
      booking_type: bookingType,
      service_type: null,
      rate_type: 'Standard',
      start_date: startDate,
      end_date: isRecurring ? null : (endDate ?? null),
      drop_off_time: dropOffTime ?? null,
      pick_up_time: pickUpTime ?? null,
      notes: notes ?? null,
      status: 'Confirmed',
      google_event_id: googleEventId,
      is_recurring: isRecurring ?? false,
      day_of_week: isRecurring ? (dayOfWeek ?? null) : null,
    },
  })

  // Send confirmation email
  let confirmationSent = false
  if (sendEmail !== false) try {
    confirmationSent = await sendConfirmation({
      owner_name: ownerName,
      owner_email: ownerEmail,
      dog_name: dogName,
      booking_type: bookingType,
      start_date: startDate,
      end_date: endDate,
      drop_off_time: dropOffTime ?? null,
      pick_up_time: pickUpTime ?? null,
      notes,
    })
  } catch (e) {
    console.error('Email error:', e)
  }

  if (confirmationSent) {
    await prisma.booking.update({ where: { id: booking.id }, data: { confirmation_sent: true } })
  }

  // Sync public calendar for this booking's date range (non-blocking, non-recurring only)
  if (!isRecurring) {
    const syncEnd = endDate ?? startDate
    syncPublicCalendarDays(startDate, syncEnd).catch(e =>
      console.error('Public calendar sync error:', e)
    )
  }

  return NextResponse.json({ ...booking, confirmation_sent: confirmationSent })
}
