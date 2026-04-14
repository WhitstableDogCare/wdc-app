import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DB_PATH = path.join(process.env.HOME || '', 'Library/Application Support/wdc-app/wdc.db')
const BACKUP_DIR = path.join(
  process.env.HOME || '',
  'Library/CloudStorage/GoogleDrive-jack@whitstabledogcare.co.uk/My Drive/Coding Projects/WDC Backups'
)

export async function POST() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({ error: 'Database file not found' }, { status: 500 })
    }

    fs.mkdirSync(BACKUP_DIR, { recursive: true })

    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10) // YYYY-MM-DD
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '-') // HH-MM
    const filename = `wdc-backup-${dateStr}-${timeStr}.db`
    const destPath = path.join(BACKUP_DIR, filename)

    fs.copyFileSync(DB_PATH, destPath)

    // List existing backups to return count
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db'))
      .sort()
      .reverse()

    return NextResponse.json({ ok: true, filename, total: backups.length, latest: backups[0] })
  } catch (err) {
    console.error('Backup error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return NextResponse.json({ backups: [] })
    }
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db'))
      .sort()
      .reverse()
      .slice(0, 5) // last 5
    return NextResponse.json({ backups })
  } catch {
    return NextResponse.json({ backups: [] })
  }
}
