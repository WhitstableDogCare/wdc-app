import cron from 'node-cron'
import notifier from 'node-notifier'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

const DB_PATH = `${process.env.HOME}/Library/Application Support/wdc-app/wdc.db`
const BACKUP_FOLDER = `${process.env.HOME}/Library/CloudStorage/GoogleDrive-jack@whitstabledogcare.co.uk/My Drive/Coding Projects/WDC Backups`
const STATE_FILE = `${process.env.HOME}/Library/Application Support/wdc-app/last-backup.json`

function getLastBackupDate(): Date | null {
  try {
    if (!fs.existsSync(STATE_FILE)) return null
    const { lastBackup } = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    return lastBackup ? new Date(lastBackup) : null
  } catch {
    return null
  }
}

function saveLastBackupDate(date: Date) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ lastBackup: date.toISOString() }))
}

async function runBackup() {
  try {
    if (!fs.existsSync(BACKUP_FOLDER)) {
      fs.mkdirSync(BACKUP_FOLDER, { recursive: true })
    }

    if (!fs.existsSync(DB_PATH)) {
      throw new Error('Database file not found')
    }

    const date = new Date().toISOString().split('T')[0]

    const dbBuffer = fs.readFileSync(DB_PATH)
    fs.writeFileSync(path.join(BACKUP_FOLDER, `wdc-backup-${date}.db`), dbBuffer)

    const [dogs, bookings, invoices, incidents] = await Promise.all([
      prisma.dog.findMany({
        include: { owners: true, vets: true, buddies: true, trial_reviews: true, bookings: true, invoices: true },
        orderBy: { name: 'asc' },
      }),
      prisma.booking.findMany({ orderBy: { start_date: 'desc' } }),
      prisma.invoice.findMany({ orderBy: { invoice_date: 'desc' } }),
      prisma.incident.findMany({ orderBy: { incident_date: 'desc' } }),
    ])

    const backup = {
      exported_at: new Date().toISOString(),
      version: 2,
      dogs,
      bookings,
      invoices,
      incidents,
    }

    fs.writeFileSync(
      path.join(BACKUP_FOLDER, `wdc-data-${date}.json`),
      JSON.stringify(backup, null, 2)
    )

    saveLastBackupDate(new Date())

    notifier.notify({
      title: 'WDC Backup',
      message: `✅ Weekly backup saved — wdc-backup-${date}.db + wdc-data-${date}.json`,
      sound: false,
    })

    console.log(`[backup] ✅ Backup complete: ${date}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    notifier.notify({
      title: 'WDC Backup',
      message: `⚠️ Backup failed — ${message}`,
      sound: true,
    })
    console.error(`[backup] ❌ Backup failed:`, message)
  }
}

function daysSince(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
}

export function startBackupScheduler() {
  // Monday at 9:00am
  cron.schedule('0 9 * * 1', runBackup, { timezone: 'Europe/London' })

  // On startup: run immediately if last backup was more than 7 days ago (or never)
  const last = getLastBackupDate()
  if (!last || daysSince(last) >= 7) {
    console.log('[backup] Missed backup detected — running now')
    runBackup()
  } else {
    console.log(`[backup] Last backup: ${last.toISOString().split('T')[0]} — next run Monday 9am`)
  }
}
