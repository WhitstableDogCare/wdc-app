export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createCalendarEvent } from '@/lib/google-calendar'
import { readConfig, writeConfig } from '@/lib/config'
import { syncPublicCalendarDays } from '@/lib/public-calendar'
import { generateInvoiceHtml } from '@/lib/invoice-html'
import { inferPresetFromTimes, buildServiceLines, serviceAmount } from '@/lib/invoice-utils'
import nodemailer from 'nodemailer'
import puppeteer from 'puppeteer'
import path from 'path'
import { randomUUID } from 'crypto'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmt12(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${ampm}`
}

async function createInvoiceAndSendEmail(booking: {
  id: number
  dog_id: number | null
  dog_name: string
  owner_name: string | null
  owner_email: string | null
  booking_type: string
  start_date: string
  end_date: string | null
  drop_off_time: string | null
  pick_up_time: string | null
  notes: string | null
}): Promise<{ invoiceId: number | null; sent: boolean }> {
  const config = readConfig()
  if (!config.gmailAppPassword || !config.businessEmail) return { invoiceId: null, sent: false }

  let ownerName = booking.owner_name
  let ownerEmail = booking.owner_email
  let clientPhone: string | null = null
  let clientAddress: string | null = null
  let dogBreed: string | null = null

  if (booking.dog_id) {
    const dog = await prisma.dog.findUnique({
      where: { id: booking.dog_id },
      select: { breed: true, owners: { select: { name: true, email: true, phone: true, address: true }, take: 1 } },
    })
    dogBreed = dog?.breed ?? null
    const ownerRecord = dog?.owners?.[0] ?? null
    if (!ownerEmail && ownerRecord?.email) ownerEmail = ownerRecord.email
    if (!ownerName && ownerRecord?.name) ownerName = ownerRecord.name
    clientPhone = ownerRecord?.phone ?? null
    clientAddress = ownerRecord?.address ?? null
  }

  if (!ownerEmail) return { invoiceId: null, sent: false }

  const isBoarding = booking.booking_type.startsWith('Boarding')
  const preset = inferPresetFromTimes(booking.drop_off_time, booking.pick_up_time, isBoarding)
  const services = preset
    ? buildServiceLines(preset, { start_date: booking.start_date, end_date: booking.end_date }, randomUUID)
    : []
  const subtotal = services.reduce((sum, s) => sum + serviceAmount(s), 0)

  const nights = isBoarding && booking.end_date
    ? Math.round((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / 86400000)
    : 0
  const applyDiscount = nights >= 7
  const total = applyDiscount ? subtotal * 0.9 : subtotal

  const nextNum = config.nextInvoiceNumber ?? 1
  const invoiceNumber = String(nextNum).padStart(4, '0')
  writeConfig({ ...config, nextInvoiceNumber: nextNum + 1 })

  const invoice = await prisma.invoice.create({
    data: {
      invoice_number: invoiceNumber,
      dog_id: booking.dog_id ?? null,
      booking_id: booking.id,
      client_name: ownerName ?? null,
      client_email: ownerEmail,
      client_phone: clientPhone,
      client_address: clientAddress,
      dog_name: booking.dog_name,
      dog_breed: dogBreed,
      services: JSON.stringify(services),
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: booking.start_date,
      apply_discount: applyDiscount,
      total,
      status: 'Unpaid',
    },
  })

  const invoiceHtml = generateInvoiceHtml(invoice, config)
  const browser = await puppeteer.launch({ headless: true })
  let pdfBuffer: Buffer
  try {
    const page = await browser.newPage()
    await page.setContent(invoiceHtml, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true,
    })
    pdfBuffer = Buffer.from(pdf)
  } finally {
    await browser.close()
  }

  const isTrial = booking.booking_type.includes('Trial')
  const dropStr = booking.drop_off_time ? ` at ${fmt12(booking.drop_off_time)}` : ''
  const pickStr = booking.pick_up_time ? ` at ${fmt12(booking.pick_up_time)}` : ''
  const dateStr = isBoarding
    ? `Drop-off: ${formatDate(booking.start_date)}${dropStr}<br/>Pick-up: ${formatDate(booking.end_date!)}${pickStr}`
    : `${formatDate(booking.start_date)}${dropStr}${pickStr ? ` – pick-up${pickStr}` : ''}`
  const businessName = config.businessName ?? 'Whitstable Dog Care'
  const dueStr = formatDate(booking.start_date)

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <img src="cid:logo" alt="${businessName}" style="width:80px;margin-bottom:16px"/>
      <h2 style="color:#2d2d4e">${isTrial ? 'Trial Booking Confirmed' : 'Booking Confirmed'}</h2>
      <p>Hi ${ownerName ?? 'there'},</p>
      <p>We're pleased to confirm the following ${isTrial ? 'trial ' : ''}booking for <strong>${booking.dog_name}</strong>:</p>
      ${isTrial ? `<p style="background:#f0f7ff;border-left:4px solid #4a90d9;padding:10px 14px;border-radius:4px;color:#2d4e7a">🔍 <strong>This is a trial visit.</strong> We'll observe ${booking.dog_name} throughout to ensure they're happy and comfortable with us.</p>` : ''}
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold;width:40%">Type</td><td style="padding:8px;background:#f9f9f9">${booking.booking_type}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Date${isBoarding ? 's' : ''}</td><td style="padding:8px">${dateStr}</td></tr>
        ${booking.notes ? `<tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">Notes</td><td style="padding:8px;background:#f9f9f9">${booking.notes}</td></tr>` : ''}
      </table>
      <p style="background:#fff8ec;border-left:4px solid #c98a2b;padding:10px 14px;border-radius:4px;color:#4a3000">🐾 <strong>Arrival instructions</strong><br/>When you arrive, please use the side gate and do not ring the front doorbell — this unsettles the dogs in our care. Send us a WhatsApp to let us know you're outside, keep your dog on the lead, and we'll come right out. If you haven't heard from us in a few minutes, give us a call.</p>
      <p style="background:#f0fdf4;border-left:4px solid #16a34a;padding:10px 14px;border-radius:4px;color:#14532d;margin-top:12px;">💳 <strong>Invoice #${invoiceNumber} attached</strong> — payment of <strong>£${total.toFixed(2)}</strong> is due by <strong>${dueStr}</strong>. You can pay by bank transfer or bring cash on the day.</p>
      <p>If you have any questions please don't hesitate to get in touch.</p>
      <p>Many thanks,<br/><strong>${businessName}</strong><br/>${config.businessPhone ?? ''}</p>
    </div>
  `

  const logoPath = path.join(process.cwd(), 'public', 'wdc-logo.png')
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.businessEmail, pass: config.gmailAppPassword },
  })
  await transporter.sendMail({
    from: `"${businessName}" <${config.businessEmail}>`,
    to: ownerEmail,
    subject: `${isTrial ? 'Trial ' : ''}Booking Confirmed + Invoice #${invoiceNumber} — ${booking.dog_name}`,
    html,
    attachments: [
      { filename: 'wdc-logo.png', path: logoPath, cid: 'logo' },
      { filename: `invoice-${invoiceNumber}.pdf`, content: pdfBuffer },
    ],
  })

  return { invoiceId: invoice.id, sent: true }
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
    include: {
      dog: { select: { id: true, name: true, photo_path: true, is_solo: true } },
      invoice: { select: { id: true, invoice_number: true, status: true, total: true } },
    },
    orderBy: { start_date: 'asc' },
  })
  return NextResponse.json(bookings)
}

// POST /api/bookings
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { dogId, dogName, ownerName, ownerEmail, bookingType, startDate, endDate, dropOffTime, pickUpTime, notes, sendEmail } = body

  // Capacity check — max 5 confirmed bookings on any day in the range
  const checkEnd = endDate ?? startDate
  const overlapping = await prisma.booking.findMany({
    where: {
      status: 'Confirmed',
      start_date: { lte: checkEnd },
      OR: [
        { end_date: { gte: startDate } },
        { end_date: null, start_date: { gte: startDate } },
      ],
    },
  })
  if (overlapping.length >= 5) {
    return NextResponse.json({ error: 'Capacity full — already 5 bookings on those dates.' }, { status: 409 })
  }

  // Create calendar event
  const googleEventId = await createCalendarEvent({
    title: `${bookingType}: ${dogName}`,
    startDate,
    endDate: endDate ?? startDate,
    dropOffTime: dropOffTime ?? null,
    pickUpTime: pickUpTime ?? null,
    description: notes ?? '',
  })

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
      end_date: endDate ?? null,
      drop_off_time: dropOffTime ?? null,
      pick_up_time: pickUpTime ?? null,
      notes: notes ?? null,
      status: 'Confirmed',
      google_event_id: googleEventId,
    },
  })

  let confirmationSent = false
  if (sendEmail !== false) {
    try {
      const result = await createInvoiceAndSendEmail({
        id: booking.id,
        dog_id: dogId ?? null,
        dog_name: dogName,
        owner_name: ownerName,
        owner_email: ownerEmail,
        booking_type: bookingType,
        start_date: startDate,
        end_date: endDate ?? null,
        drop_off_time: dropOffTime ?? null,
        pick_up_time: pickUpTime ?? null,
        notes,
      })
      confirmationSent = result.sent
    } catch (e) {
      console.error('Email/invoice error:', e)
    }
  }

  if (confirmationSent) {
    await prisma.booking.update({ where: { id: booking.id }, data: { confirmation_sent: true } })
  }

  syncPublicCalendarDays(startDate, endDate ?? startDate).catch(e =>
    console.error('Public calendar sync error:', e)
  )

  return NextResponse.json({ ...booking, confirmation_sent: confirmationSent })
}
