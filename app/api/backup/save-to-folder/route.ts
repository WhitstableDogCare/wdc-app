export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

const DB_PATH = `${process.env.HOME}/Library/Application Support/wdc-app/wdc.db`
const BACKUP_FOLDER = `${process.env.HOME}/Library/CloudStorage/GoogleDrive-jack@whitstabledogcare.co.uk/My Drive/Coding Projects/WDC Backups`

export async function POST() {
  try {
    // Ensure backup folder exists
    if (!fs.existsSync(BACKUP_FOLDER)) {
      fs.mkdirSync(BACKUP_FOLDER, { recursive: true })
    }

    const date = new Date().toISOString().split('T')[0]

    // Save .db file
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({ error: 'Database file not found' }, { status: 404 })
    }
    const dbBuffer = fs.readFileSync(DB_PATH)
    const dbDest = path.join(BACKUP_FOLDER, `wdc-backup-${date}.db`)
    fs.writeFileSync(dbDest, dbBuffer)

    // Save .json file
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

    const jsonDest = path.join(BACKUP_FOLDER, `wdc-data-${date}.json`)
    fs.writeFileSync(jsonDest, JSON.stringify(backup, null, 2))

    return NextResponse.json({
      success: true,
      date,
      files: [
        `wdc-backup-${date}.db`,
        `wdc-data-${date}.json`,
      ],
      folder: BACKUP_FOLDER,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
