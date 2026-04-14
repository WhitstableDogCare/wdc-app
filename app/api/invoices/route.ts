import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readConfig, writeConfig } from '@/lib/config'

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { invoice_date: 'desc' },
    include: { dog: { select: { id: true, name: true, photo_path: true } } },
  })
  return NextResponse.json(invoices)
}

export async function POST(request: Request) {
  const body = await request.json()
  const config = readConfig()
  const nextNum = config.nextInvoiceNumber ?? 1
  const invoiceNumber = String(nextNum).padStart(4, '0')

  // Increment counter
  writeConfig({ ...config, nextInvoiceNumber: nextNum + 1 })

  const invoice = await prisma.invoice.create({
    data: {
      invoice_number: invoiceNumber,
      dog_id: body.dog_id ?? null,
      client_name: body.client_name ?? null,
      client_email: body.client_email ?? null,
      client_phone: body.client_phone ?? null,
      client_address: body.client_address ?? null,
      dog_name: body.dog_name ?? null,
      dog_breed: body.dog_breed ?? null,
      services: JSON.stringify(body.services ?? []),
      notes: body.notes ?? null,
      invoice_date: body.invoice_date ?? new Date().toISOString().split('T')[0],
      due_date: body.due_date ?? null,
      apply_discount: body.apply_discount ?? false,
      total: body.total ?? 0,
    },
  })
  return NextResponse.json(invoice)
}
