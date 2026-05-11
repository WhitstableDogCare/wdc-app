export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createCalendarEvent } from '@/lib/google-calendar'
import { readConfig, writeConfig } from '@/lib/config'
import { syncPublicCalendarDays } from '@/lib/public-calendar'
import { generateInvoiceHtml } from '@/lib/invoice-html'
import { buildGroupServiceLines, serviceAmount, type GroupDay } from '@/lib/invoice-utils'
import nodemailer from 'nodemailer'
import puppeteer from 'puppeteer'
import path from 'path'
import { randomUUID } from 'crypto'

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmt12(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${ampm}`
}

// POST /api/bookings/group
// Creates multiple daycare bookings (one per day) with a single shared invoice.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { dogId, dogName, ownerName, ownerEmail, days, notes, sendEmail } = body as {
    dogId?: number
    dogName: string
    ownerName?: string
    ownerEmail?: string
    days: GroupDay[]
    notes?: string
    sendEmail?: boolean
  }

  if (!dogName) return NextResponse.json({ error: 'Dog name is required.' }, { status: 400 })
  if (!days?.length || days.length < 2) return NextResponse.json({ error: 'At least 2 days are required for a group booking.' }, { status: 400 })

  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date))

  // Capacity check — each day must have fewer than 5 confirmed bookings
  for (const day of sortedDays) {
    const overlapping = await prisma.booking.findMany({
      where: {
        status: 'Confirmed',
        start_date: { lte: day.date },
        OR: [
          { end_date: { gte: day.date } },
          { end_date: null, start_date: { gte: day.date } },
        ],
      },
    })
    if (overlapping.length >= 5) {
      return NextResponse.json(
        { error: `Capacity full on ${formatDate(day.date)} — already 5 bookings.` },
        { status: 409 }
      )
    }
  }

  const groupId = randomUUID()

  // Create one booking + calendar event per day
  const bookings = []
  for (const day of sortedDays) {
    const googleEventId = await createCalendarEvent({
      title: `Daycare: ${dogName}`,
      startDate: day.date,
      endDate: day.date,
      dropOffTime: day.dropOffTime ?? null,
      pickUpTime: day.pickUpTime ?? null,
      description: notes ?? '',
    })
    const booking = await prisma.booking.create({
      data: {
        ...(dogId ? { dog: { connect: { id: dogId } } } : {}),
        dog_name: dogName,
        owner_name: ownerName ?? null,
        owner_email: ownerEmail ?? null,
        booking_type: 'Daycare',
        service_type: null,
        rate_type: 'Standard',
        start_date: day.date,
        end_date: null,
        drop_off_time: day.dropOffTime ?? null,
        pick_up_time: day.pickUpTime ?? null,
        notes: notes ?? null,
        status: 'Confirmed',
        google_event_id: googleEventId,
        booking_group_id: groupId,
      },
    })
    bookings.push(booking)
  }

  // Invoice + email
  let confirmationSent = false
  if (sendEmail !== false) {
    try {
      const config = readConfig()
      if (config.gmailAppPassword && config.businessEmail) {
        let resolvedOwnerName = ownerName ?? null
        let resolvedOwnerEmail = ownerEmail ?? null
        let clientPhone: string | null = null
        let clientAddress: string | null = null
        let dogBreed: string | null = null

        if (dogId) {
          const dog = await prisma.dog.findUnique({
            where: { id: dogId },
            select: { breed: true, owners: { select: { name: true, email: true, phone: true, address: true }, take: 1 } },
          })
          dogBreed = dog?.breed ?? null
          const ownerRecord = dog?.owners?.[0] ?? null
          if (!resolvedOwnerEmail && ownerRecord?.email) resolvedOwnerEmail = ownerRecord.email
          if (!resolvedOwnerName && ownerRecord?.name) resolvedOwnerName = ownerRecord.name
          clientPhone = ownerRecord?.phone ?? null
          clientAddress = ownerRecord?.address ?? null
        }

        if (resolvedOwnerEmail) {
          const services = buildGroupServiceLines(sortedDays, randomUUID)
          const subtotal = services.reduce((sum, s) => sum + serviceAmount(s), 0)
          const total = subtotal

          const nextNum = config.nextInvoiceNumber ?? 1
          const invoiceNumber = String(nextNum).padStart(4, '0')
          writeConfig({ ...config, nextInvoiceNumber: nextNum + 1 })

          const invoice = await prisma.invoice.create({
            data: {
              invoice_number: invoiceNumber,
              dog_id: dogId ?? null,
              booking_id: null,
              booking_group_id: groupId,
              client_name: resolvedOwnerName ?? null,
              client_email: resolvedOwnerEmail,
              client_phone: clientPhone,
              client_address: clientAddress,
              dog_name: dogName,
              dog_breed: dogBreed,
              services: JSON.stringify(services),
              invoice_date: new Date().toISOString().split('T')[0],
              due_date: sortedDays[0].date,
              apply_discount: false,
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
            const pdf = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }, printBackground: true })
            pdfBuffer = Buffer.from(pdf)
          } finally {
            await browser.close()
          }

          const businessName = config.businessName ?? 'Whitstable Dog Care'
          const firstDate = formatDate(sortedDays[0].date)
          const lastDate = formatDate(sortedDays[sortedDays.length - 1].date)
          const dayCount = sortedDays.length
          const dueStr = formatDate(sortedDays[0].date)

          const dateRows = sortedDays.map(d => {
            const drop = d.dropOffTime ? ` · drop-off ${fmt12(d.dropOffTime)}` : ''
            const pick = d.pickUpTime ? `, pick-up ${fmt12(d.pickUpTime)}` : ''
            return `<tr><td style="padding:6px 8px;background:#f9f9f9">${formatDate(d.date)}${drop}${pick}</td></tr>`
          }).join('')

          const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <img src="cid:logo" alt="${businessName}" style="width:80px;margin-bottom:16px"/>
              <h2 style="color:#2d2d4e">Booking Confirmed</h2>
              <p>Hi ${resolvedOwnerName ?? 'there'},</p>
              <p>We're pleased to confirm the following daycare booking${dayCount > 1 ? 's' : ''} for <strong>${dogName}</strong>:</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr><td style="padding:8px;font-weight:bold;width:40%">Type</td><td style="padding:8px">Daycare · ${dayCount} day${dayCount !== 1 ? 's' : ''}</td></tr>
                <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold;vertical-align:top">Period</td><td style="padding:8px;background:#f9f9f9">${firstDate} – ${lastDate}</td></tr>
              </table>
              <details style="margin-bottom:16px">
                <summary style="cursor:pointer;font-size:13px;color:var(--text-muted, #666)">View all ${dayCount} dates</summary>
                <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:13px">${dateRows}</table>
              </details>
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
            to: resolvedOwnerEmail,
            subject: `Booking Confirmed + Invoice #${invoiceNumber} — ${dogName} (${dayCount} days)`,
            html,
            attachments: [
              { filename: 'wdc-logo.png', path: logoPath, cid: 'logo' },
              { filename: `invoice-${invoiceNumber}.pdf`, content: pdfBuffer! },
            ],
          })

          // Mark all bookings as confirmation sent
          await prisma.booking.updateMany({
            where: { booking_group_id: groupId },
            data: { confirmation_sent: true },
          })

          confirmationSent = true
        }
      }
    } catch (e) {
      console.error('Group booking email/invoice error:', e)
    }
  }

  // Sync public calendar for the full span of dates (non-blocking)
  syncPublicCalendarDays(sortedDays[0].date, sortedDays[sortedDays.length - 1].date).catch(e =>
    console.error('Public calendar sync error:', e)
  )

  return NextResponse.json({
    groupId,
    bookingIds: bookings.map(b => b.id),
    firstBookingId: bookings[0].id,
    confirmation_sent: confirmationSent,
  })
}
