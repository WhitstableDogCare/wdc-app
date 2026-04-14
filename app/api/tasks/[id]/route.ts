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

// PATCH /api/tasks/[id] — mark a task as complete
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { tasklistId } = await req.json()
    if (!tasklistId) return NextResponse.json({ error: 'tasklistId is required' }, { status: 400 })

    const tasksApi = google.tasks({ version: 'v1', auth: getAuth() })
    await tasksApi.tasks.update({
      tasklist: tasklistId,
      task: id,
      requestBody: { id, status: 'completed' },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Complete task error:', e)
    return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 })
  }
}
