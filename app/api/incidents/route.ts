import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const incidents = await prisma.incident.findMany({
    orderBy: { incident_date: 'desc' },
    include: { dog: { select: { id: true, name: true, photo_path: true } } },
  })
  return NextResponse.json(incidents)
}

export async function POST(request: Request) {
  const body = await request.json()
  const incident = await prisma.incident.create({
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
