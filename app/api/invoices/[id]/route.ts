import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const invoice = await prisma.invoice.findUnique({
    where: { id: parseInt(id) },
    include: { dog: { select: { id: true, name: true, photo_path: true } } },
  })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(invoice)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const invoice = await prisma.invoice.update({
    where: { id: parseInt(id) },
    data: {
      client_name: body.client_name ?? null,
      client_email: body.client_email ?? null,
      client_phone: body.client_phone ?? null,
      client_address: body.client_address ?? null,
      dog_name: body.dog_name ?? null,
      dog_breed: body.dog_breed ?? null,
      services: JSON.stringify(body.services ?? []),
      notes: body.notes ?? null,
      invoice_date: body.invoice_date ?? null,
      due_date: body.due_date ?? null,
      apply_discount: body.apply_discount ?? false,
      total: body.total ?? 0,
    },
  })
  return NextResponse.json(invoice)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  if ('booking_id' in body) {
    const bookingId = body.booking_id ? parseInt(body.booking_id) : null
    if (bookingId) {
      const conflict = await prisma.invoice.findFirst({
        where: { booking_id: bookingId, id: { not: parseInt(id) } },
      })
      if (conflict) {
        return NextResponse.json({ error: `Booking is already linked to invoice #${conflict.invoice_number}` }, { status: 409 })
      }
    }
    const invoice = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: { booking_id: bookingId },
    })
    return NextResponse.json(invoice)
  }

  const invoice = await prisma.invoice.update({
    where: { id: parseInt(id) },
    data: {
      status: body.status,
      paid_date: body.paid_date ?? null,
      payment_method: body.payment_method ?? null,
    },
  })
  return NextResponse.json(invoice)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.invoice.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
