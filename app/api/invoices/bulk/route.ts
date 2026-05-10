export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readConfig, writeConfig } from '@/lib/config'
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

// GET — list upcoming confirmed bookings without a linked invoice
export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  const bookings = await prisma.booking.findMany({
    where: {
      status: 'Confirmed',
      start_date: { gte: today },
      invoice: null,
    },
    include: {
      dog: { select: { id: true, name: true, breed: true, owners: { select: { name: true, email: true, phone: true, address: true }, take: 1 } } },
    },
    orderBy: { start_date: 'asc' },
  })

  // Resolve owner email — use booking field first, fall back to dog owner record
  const result = bookings.map(b => {
    const ownerRecord = b.dog?.owners?.[0] ?? null
    const ownerName = b.owner_name ?? ownerRecord?.name ?? null
    const ownerEmail = b.owner_email ?? ownerRecord?.email ?? null
    return {
      id: b.id,
      dog_name: b.dog_name,
      dog_breed: b.dog?.breed ?? null,
      dog_id: b.dog_id,
      owner_name: ownerName,
      owner_email: ownerEmail,
      booking_type: b.booking_type,
      start_date: b.start_date,
      end_date: b.end_date,
      drop_off_time: b.drop_off_time,
      pick_up_time: b.pick_up_time,
      notes: b.notes,
      has_email: !!ownerEmail,
    }
  })

  return NextResponse.json(result)
}

// POST — generate and send invoices for selected booking IDs
export async function POST(req: Request) {
  const { bookingIds } = await req.json() as { bookingIds: number[] }
  if (!bookingIds?.length) return NextResponse.json({ error: 'No bookings selected' }, { status: 400 })

  const config = readConfig()
  if (!config.gmailAppPassword || !config.businessEmail) {
    return NextResponse.json({ error: 'Email not configured in Settings' }, { status: 400 })
  }

  const bookings = await prisma.booking.findMany({
    where: { id: { in: bookingIds } },
    include: {
      dog: { select: { id: true, name: true, breed: true, owners: { select: { name: true, email: true, phone: true, address: true }, take: 1 } } },
    },
  })

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.businessEmail, pass: config.gmailAppPassword },
  })

  const logoPath = path.join(process.cwd(), 'public', 'wdc-logo.png')
  const businessName = config.businessName ?? 'Whitstable Dog Care'
  const results: { bookingId: number; dogName: string; status: 'sent' | 'skipped'; reason?: string }[] = []

  // Launch browser once for all PDFs
  const browser = await puppeteer.launch({ headless: true })

  try {
    for (const booking of bookings) {
      const ownerRecord = booking.dog?.owners?.[0] ?? null
      const ownerName = booking.owner_name ?? ownerRecord?.name ?? null
      const ownerEmail = booking.owner_email ?? ownerRecord?.email ?? null

      if (!ownerEmail) {
        results.push({ bookingId: booking.id, dogName: booking.dog_name, status: 'skipped', reason: 'No email address' })
        continue
      }

      // Build service lines
      const isBoarding = booking.booking_type.startsWith('Boarding')
      const preset = inferPresetFromTimes(booking.drop_off_time, booking.pick_up_time, isBoarding)
      const services = preset
        ? buildServiceLines(preset, { start_date: booking.start_date, end_date: booking.end_date }, randomUUID)
        : []
      const subtotal = services.reduce((sum, s) => sum + serviceAmount(s), 0)

      // Auto-apply 10% discount for boarding stays of 7+ nights
      const nights = isBoarding && booking.end_date
        ? Math.round((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / 86400000)
        : 0
      const applyDiscount = nights >= 7
      const total = applyDiscount ? subtotal * 0.9 : subtotal

      // Allocate invoice number
      const freshConfig = readConfig()
      const nextNum = freshConfig.nextInvoiceNumber ?? 1
      const invoiceNumber = String(nextNum).padStart(4, '0')
      writeConfig({ ...freshConfig, nextInvoiceNumber: nextNum + 1 })

      // Create invoice record
      const invoice = await prisma.invoice.create({
        data: {
          invoice_number: invoiceNumber,
          dog_id: booking.dog_id ?? null,
          booking_id: booking.id,
          client_name: ownerName ?? null,
          client_email: ownerEmail,
          client_phone: ownerRecord?.phone ?? null,
          client_address: ownerRecord?.address ?? null,
          dog_name: booking.dog_name,
          dog_breed: booking.dog?.breed ?? null,
          services: JSON.stringify(services),
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: booking.start_date,
          apply_discount: applyDiscount,
          total,
          status: 'Unpaid',
        },
      })

      // Generate PDF
      const invoiceHtml = generateInvoiceHtml(invoice, config)
      const page = await browser.newPage()
      await page.setContent(invoiceHtml, { waitUntil: 'networkidle0' })
      const pdf = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }, printBackground: true })
      await page.close()
      const pdfBuffer = Buffer.from(pdf)

      // Build email
      const isTrial = booking.booking_type.includes('Trial')
      const dropStr = booking.drop_off_time ? ` at ${fmt12(booking.drop_off_time)}` : ''
      const pickStr = booking.pick_up_time ? ` at ${fmt12(booking.pick_up_time)}` : ''
      const dateStr = isBoarding
        ? `Drop-off: ${formatDate(booking.start_date)}${dropStr}<br/>Pick-up: ${formatDate(booking.end_date!)}${pickStr}`
        : `${formatDate(booking.start_date)}${dropStr}${pickStr ? ` – pick-up${pickStr}` : ''}`
      const dueStr = formatDate(booking.start_date)

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <img src="cid:logo" alt="${businessName}" style="width:80px;margin-bottom:16px"/>
          <h2 style="color:#2d2d4e">Invoice for Upcoming ${isTrial ? 'Trial ' : ''}Booking</h2>
          <p>Hi ${ownerName ?? 'there'},</p>
          <p>Please find your invoice attached for the upcoming ${isTrial ? 'trial ' : ''}booking for <strong>${booking.dog_name}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold;width:40%">Type</td><td style="padding:8px;background:#f9f9f9">${booking.booking_type}</td></tr>
            <tr><td style="padding:8px;font-weight:bold">Date${isBoarding ? 's' : ''}</td><td style="padding:8px">${dateStr}</td></tr>
          </table>
          <p style="background:#f0fdf4;border-left:4px solid #16a34a;padding:10px 14px;border-radius:4px;color:#14532d">💳 <strong>Invoice #${invoiceNumber}</strong> — payment of <strong>£${total.toFixed(2)}</strong> is due by <strong>${dueStr}</strong>. No need to pay right now — payment is due on the day of the session. You can pay by bank transfer before the date or bring cash on the day.</p>
          <p>If you have any questions please don't hesitate to get in touch.</p>
          <p>Many thanks,<br/><strong>${businessName}</strong><br/>${config.businessPhone ?? ''}</p>
        </div>
      `

      await transporter.sendMail({
        from: `"${businessName}" <${config.businessEmail}>`,
        to: ownerEmail,
        subject: `Invoice #${invoiceNumber} — ${booking.dog_name} (${booking.booking_type})`,
        html,
        attachments: [
          { filename: 'wdc-logo.png', path: logoPath, cid: 'logo' },
          { filename: `invoice-${invoiceNumber}.pdf`, content: pdfBuffer },
        ],
      })

      await prisma.booking.update({ where: { id: booking.id }, data: { confirmation_sent: true } })
      results.push({ bookingId: booking.id, dogName: booking.dog_name, status: 'sent' })
    }
  } finally {
    await browser.close()
  }

  return NextResponse.json({ results })
}
