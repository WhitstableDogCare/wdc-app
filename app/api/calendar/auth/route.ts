export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { readConfig } from '@/lib/config'

const REDIRECT_URI = 'http://localhost:3004/api/calendar/auth/callback'

export async function GET() {
  const config = readConfig()
  if (!config.googleClientId || !config.googleClientSecret) {
    return NextResponse.json({ error: 'Google credentials not configured' }, { status: 400 })
  }

  const oauth2 = new google.auth.OAuth2(config.googleClientId, config.googleClientSecret, REDIRECT_URI)
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/tasks',
    ],
  })

  return NextResponse.redirect(url)
}
