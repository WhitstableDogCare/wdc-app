export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { readConfig } from '@/lib/config'

function getAuth() {
  const config = readConfig()
  const oauth2 = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    'http://localhost:3004/api/calendar/auth/callback'
  )
  oauth2.setCredentials({ refresh_token: config.googleRefreshToken })
  return oauth2
}

// POST /api/tasks — create a task in the default task list
export async function POST(req: NextRequest) {
  try {
    const { title, due } = await req.json()
    if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

    const tasksApi = google.tasks({ version: 'v1', auth: getAuth() })
    const res = await tasksApi.tasks.insert({
      tasklist: '@default',
      requestBody: {
        title: title.trim(),
        // Google Tasks due dates must be RFC 3339 UTC midnight
        ...(due ? { due: new Date(due + 'T00:00:00Z').toISOString() } : {}),
      },
    })

    return NextResponse.json({
      id: res.data.id,
      title: res.data.title,
      due: res.data.due ? res.data.due.split('T')[0] : null,
      tasklistId: '@default',
    })
  } catch (e) {
    console.error('Create task error:', e)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
