import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readConfig } from '@/lib/config'
import { generateInvoiceHtml } from '@/lib/invoice-html'
import nodemailer from 'nodemailer'
import puppeteer from 'puppeteer'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const toEmail: string = body.to
  const customMessage: string = body.message ?? ''

  if (!toEmail) {
    return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })
  }

  const config = readConfig()

  if (!config.gmailAppPassword) {
    return NextResponse.json(
      { error: 'Gmail app password not configured. Go to Settings to add it.' },
      { status: 400 }
    )
  }
  if (!config.businessEmail) {
    return NextResponse.json(
      { error: 'Business email not configured. Go to Settings to add it.' },
      { status: 400 }
    )
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: parseInt(id) } })
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  // Generate PDF
  const html = generateInvoiceHtml(invoice, config)
  const browser = await puppeteer.launch({ headless: true })
  let pdfBuffer: Buffer
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true,
    })
    pdfBuffer = Buffer.from(pdf)
  } finally {
    await browser.close()
  }

  // Send email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.businessEmail,
      pass: config.gmailAppPassword,
    },
  })

  const businessName = config.businessName || 'Whitstable Dog Care'
  const defaultMessage = `Please find your invoice #${invoice.invoice_number} attached.\n\nThank you for staying with ${businessName}!\n\nJack\n${businessName}`

  await transporter.sendMail({
    from: `${businessName} <${config.businessEmail}>`,
    to: toEmail,
    subject: `Invoice #${invoice.invoice_number} from ${businessName}`,
    text: customMessage || defaultMessage,
    attachments: [
      {
        filename: `invoice-${invoice.invoice_number}.pdf`,
        content: pdfBuffer,
      },
    ],
  })

  return NextResponse.json({ success: true })
}
