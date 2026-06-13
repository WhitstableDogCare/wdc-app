import fs from 'fs'
import path from 'path'
import os from 'os'

const CONFIG_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'wdc-app')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

interface Config {
  tallyApiKey?: string
  businessName?: string
  businessAddress?: string
  businessEmail?: string
  businessPhone?: string
  paymentInfo?: string
  nextInvoiceNumber?: number
  gmailAppPassword?: string
  calendarUrl?: string
  googleClientId?: string
  googleClientSecret?: string
  googleRefreshToken?: string
  publicGoogleCalendarId?: string
  personalCalendarIcalUrl?: string
  familyCalendarIcalUrl?: string
  meetAndGreetCalendarId?: string
  appPassword?: string
}

export function readConfig(): Config {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {}
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

export function writeConfig(config: Config): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}
