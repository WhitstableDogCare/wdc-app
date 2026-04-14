import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const incident = await prisma.incident.findUnique({
    where: { id: parseInt(id) },
    include: { dog: { select: { id: true, name: true, photo_path: true } } },
  })
  if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(incident)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const incident = await prisma.incident.update({
    where: { id: parseInt(id) },
    data: {
      dog_id:              body.dog_id ?? null,
      completed_by:        body.completed_by ?? null,
      incident_date:       body.incident_date ?? null,
      incident_time:       body.incident_time ?? null,
      location:            body.location ?? null,
      witnesses:           body.witnesses ?? null,
      description:         body.description ?? null,
      root_causes:         body.root_causes ?? null,
      prevention_measures: body.prevention_measures ?? null,
    },
    include: { dog: { select: { id: true, name: true, photo_path: true } } },
  })
  return NextResponse.json(incident)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.incident.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ ok: true })
}
