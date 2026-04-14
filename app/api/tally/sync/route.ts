import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readConfig, writeConfig } from '@/lib/config'

const TALLY_FORM_ID = 'nrbqY2'

export async function GET() {
  try {
    const config = readConfig()
    if (!config.tallyApiKey) {
      return NextResponse.json({ error: 'No Tally API key configured' }, { status: 400 })
    }

    const response = await fetch(
      `https://api.tally.so/forms/${TALLY_FORM_ID}/submissions?limit=100`,
      {
        headers: {
          Authorization: `Bearer ${config.tallyApiKey}`,
        },
      }
    )

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json(
        { error: `Tally API error: ${response.status} ${text}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const submissions = data.submissions || data.data || []

    // Store new submissions
    let newCount = 0
    for (const sub of submissions) {
      const submissionId = sub.id || sub.submissionId || String(sub.responseId)
      const existing = await prisma.tallySubmission.findUnique({
        where: { submission_id: submissionId },
      })
      if (!existing) {
        await prisma.tallySubmission.create({
          data: {
            submission_id: submissionId,
            raw_data: JSON.stringify(sub),
            dog_id: null,
          },
        })
        newCount++
      }
    }

    // Return all submissions with import status
    const allSubmissions = await prisma.tallySubmission.findMany({
      include: { dog: { select: { id: true, name: true } } },
      orderBy: { imported_at: 'desc' },
    })

    return NextResponse.json({ newCount, submissions: allSubmissions })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

export async function PUT() {
  try {
    const config = readConfig()
    return NextResponse.json({ hasKey: !!config.tallyApiKey })
  } catch {
    return NextResponse.json({ hasKey: false })
  }
}

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json()
    const config = readConfig()
    config.tallyApiKey = apiKey
    writeConfig(config)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 })
  }
}
