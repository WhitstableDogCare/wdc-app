import { NextRequest, NextResponse } from 'next/server'
import { readConfig } from '@/lib/config'

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  const config = readConfig()

  if (!config.appPassword) {
    return NextResponse.json({ error: 'No app password set. Add appPassword to config.' }, { status: 500 })
  }

  if (password !== config.appPassword) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('wdc-session', process.env.SESSION_SECRET!, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return response
}
