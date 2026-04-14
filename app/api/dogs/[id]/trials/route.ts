export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const dogId = parseInt(id)
  if (isNaN(dogId)) return NextResponse.json({ error: 'Invalid dog ID' }, { status: 400 })

  const trials = await prisma.trialReview.findMany({
    where: { dog_id: dogId },
    orderBy: { created_at: 'desc' },
  })
  return NextResponse.json(trials)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const dogId = parseInt(id)
  if (isNaN(dogId)) return NextResponse.json({ error: 'Invalid dog ID' }, { status: 400 })

  const body = await req.json()
  const trial = await prisma.trialReview.create({
    data: {
      dog_id: dogId,
      trial_type:       body.trial_type       ?? 'Boarding',
      outcome:          body.outcome           ?? 'Pending',
      start_datetime:   body.start_datetime    ?? null,
      end_datetime:     body.end_datetime      ?? null,
      dogs_mixed_with:  body.dogs_mixed_with   ?? null,
      completed_by:     body.completed_by      ?? null,
      log_date:         body.log_date          ?? null,
      behaviour_notes:  body.behaviour_notes   ?? null,
      toileting_notes:  body.toileting_notes   ?? null,
      appetite_notes:   body.appetite_notes    ?? null,
      sleeping_notes:   body.sleeping_notes    ?? null,
      walks_notes:      body.walks_notes       ?? null,
      health_notes:     body.health_notes      ?? null,
      actions_notes:    body.actions_notes     ?? null,
    },
  })
  return NextResponse.json(trial, { status: 201 })
}
