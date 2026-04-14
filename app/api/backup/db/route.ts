export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import fs from 'fs'

const DB_PATH = `${process.env.HOME}/Library/Application Support/wdc-app/wdc.db`

export async function GET() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({ error: 'Database file not found' }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(DB_PATH)
    const date = new Date().toISOString().split('T')[0]

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="wdc-backup-${date}.db"`,
        'Content-Length': String(fileBuffer.length),
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
