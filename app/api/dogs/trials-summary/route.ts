export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const trials = await prisma.trialReview.findMany({
    select: { dog_id: true, trial_type: true, outcome: true },
  })

  const summary: Record<number, { daycareEligible: boolean; boardingEligible: boolean; daycareFailed: boolean; boardingFailed: boolean }> = {}

  for (const t of trials) {
    if (!summary[t.dog_id]) summary[t.dog_id] = { daycareEligible: false, boardingEligible: false, daycareFailed: false, boardingFailed: false }
    if (t.outcome === 'Passed') {
      summary[t.dog_id].daycareEligible = true
      if (t.trial_type === 'Boarding') summary[t.dog_id].boardingEligible = true
    } else if (t.outcome === 'Failed') {
      if (t.trial_type === 'Daycare') summary[t.dog_id].daycareFailed = true
      if (t.trial_type === 'Boarding') summary[t.dog_id].boardingFailed = true
    }
  }

  return NextResponse.json(summary)
}
