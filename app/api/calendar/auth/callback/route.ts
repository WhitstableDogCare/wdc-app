export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { readConfig, writeConfig } from '@/lib/config'

const REDIRECT_URI = 'http://localhost:3004/api/calendar/auth/callback'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/settings?calauth=error', req.url))
  }

  const config = readConfig()
  const oauth2 = new google.auth.OAuth2(config.googleClientId, config.googleClientSecret, REDIRECT_URI)

  const { tokens } = await oauth2.getToken(code)
  writeConfig({ ...config, googleRefreshToken: tokens.refresh_token ?? config.googleRefreshToken })

  return NextResponse.redirect(new URL('/settings?calauth=success', req.url))
}
