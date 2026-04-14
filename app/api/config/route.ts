import { NextResponse } from 'next/server'
import { readConfig, writeConfig } from '@/lib/config'

export async function GET() {
  const config = readConfig()
  return NextResponse.json(config)
}

export async function PUT(request: Request) {
  const body = await request.json()
  const current = readConfig()
  const updated = { ...current, ...body }
  writeConfig(updated)
  return NextResponse.json(updated)
}
