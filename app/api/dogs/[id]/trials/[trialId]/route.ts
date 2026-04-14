export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; trialId: string }> }) {
  const { trialId } = await params
  const id = parseInt(trialId)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid trial ID' }, { status: 400 })

  const body = await req.json()
  const trial = await prisma.trialReview.update({
    where: { id },
    data: {
      trial_type:       body.trial_type,
      outcome:          body.outcome,
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
  return NextResponse.json(trial)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; trialId: string }> }) {
  const { trialId } = await params
  const id = parseInt(trialId)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid trial ID' }, { status: 400 })

  await prisma.trialReview.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
