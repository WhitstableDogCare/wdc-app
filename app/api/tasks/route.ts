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

// GET /api/tasks — fetch incomplete tasks due today across all task lists
export async function GET() {
  try {
    const tasksApi = google.tasks({ version: 'v1', auth: getAuth() })

    // Google Tasks stores due dates as midnight UTC (e.g. 2026-04-27T00:00:00.000Z)
    // We compare the date portion directly to avoid timezone/exclusivity issues with the API filter
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) // YYYY-MM-DD

    const listsRes = await tasksApi.tasklists.list({ maxResults: 20 })
    const lists = listsRes.data.items ?? []

    const result: { id: string; title: string; due: string | null; listTitle: string; notes: string | null }[] = []

    for (const list of lists) {
      if (!list.id) continue
      const tasksRes = await tasksApi.tasks.list({
        tasklist: list.id,
        showCompleted: false,
        showHidden: false,
      })
      for (const task of tasksRes.data.items ?? []) {
        if (task.status === 'completed' || !task.title || !task.due) continue
        const taskDate = task.due.split('T')[0]
        if (taskDate !== todayStr) continue
        result.push({
          id: task.id ?? '',
          title: task.title,
          due: taskDate,
          listTitle: list.title ?? '',
          notes: task.notes ?? null,
        })
      }
    }

    return NextResponse.json(result)
  } catch (e) {
    console.error('Google Tasks fetch error:', e)
    return NextResponse.json([]) // Fail gracefully — don't break the dashboard
  }
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
