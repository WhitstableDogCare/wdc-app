import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readConfig } from '@/lib/config'

// Returns raw field labels from the first Tally submission so we can see the real structure
export async function GET() {
  try {
    // First check stored submissions
    const stored = await prisma.tallySubmission.findFirst()
    if (stored) {
      const raw = JSON.parse(stored.raw_data)
      const fields = raw.fields || raw.data?.fields || []
      return NextResponse.json({
        source: 'stored_submission',
        rawKeys: Object.keys(raw),
        fields: fields.map((f: { key: string; label?: string; type?: string; value: unknown }) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          value: f.value,
        })),
        fullRaw: raw,
      })
    }

    // Otherwise fetch live from Tally
    const config = readConfig()
    if (!config.tallyApiKey) {
      return NextResponse.json({ error: 'No API key. Store a submission first by syncing.' }, { status: 400 })
    }

    const response = await fetch('https://api.tally.so/forms/nrbqY2/submissions?limit=1', {
      headers: { Authorization: `Bearer ${config.tallyApiKey}` },
    })

    const data = await response.json()
    const submissions = data.submissions || data.data || []
    const first = submissions[0]

    if (!first) {
      return NextResponse.json({ error: 'No submissions found', fullResponse: data })
    }

    const fields = first.fields || first.data?.fields || []
    return NextResponse.json({
      source: 'live_api',
      rawKeys: Object.keys(first),
      fields: fields.map((f: { key: string; label?: string; type?: string; value: unknown }) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        value: f.value,
      })),
      fullRaw: first,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
