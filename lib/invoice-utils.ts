import { isPeakDate } from './peak-rate'

export interface GroupDay {
  date: string
  dropOffTime: string | null
  pickUpTime: string | null
}

// Build service lines for a group booking where each day can have different times.
// Groups consecutive days that share the same preset and peak/standard rate.
export function buildGroupServiceLines(days: GroupDay[], uid: () => string): ServiceLine[] {
  if (days.length === 0) return []
  const dayInfos = days.map(d => ({
    date: d.date,
    preset: inferPresetFromTimes(d.dropOffTime, d.pickUpTime, false),
    peak: isPeakDate(d.date),
  }))
  const lines: ServiceLine[] = []
  let i = 0
  while (i < dayInfos.length) {
    const cur = dayInfos[i]
    let j = i + 1
    while (
      j < dayInfos.length &&
      dayInfos[j].preset?.name === cur.preset?.name &&
      dayInfos[j].peak === cur.peak
    ) j++
    if (cur.preset) {
      const peak = cur.peak
      lines.push({
        id: uid(),
        type: 'daycare',
        description: `${cur.preset.name} (${peak ? 'Peak Rate' : 'Standard Rate'})`,
        startDate: dayInfos[i].date,
        endDate: '',
        quantity: j - i,
        rate: peak ? cur.preset.peak : cur.preset.standard,
      })
    }
    i = j
  }
  return lines
}

export const SERVICE_PRESETS = [
  { name: 'Half Day Care', detail: 'max 4 hours', standard: 20, peak: 25, type: 'daycare' as const },
  { name: 'Full Day Care', detail: 'max 8 hours', standard: 30, peak: 40, type: 'daycare' as const },
  { name: 'Long Day Care', detail: 'max 12 hours', standard: 40, peak: 50, type: 'daycare' as const },
  { name: 'Overnight Care', detail: '12–24 hours', standard: 50, peak: 60, type: 'boarding' as const },
]

export type ServicePreset = typeof SERVICE_PRESETS[number]

export interface ServiceLine {
  id: string
  type: 'boarding' | 'daycare'
  description: string
  startDate: string
  endDate: string
  quantity: number
  rate: number
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function calcNights(s: ServiceLine): number {
  if (s.type !== 'boarding' || !s.startDate || !s.endDate) return s.quantity
  const diff = Math.round((new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 86400000)
  return Math.max(0, diff)
}

export function serviceAmount(s: ServiceLine): number {
  return calcNights(s) * s.rate
}

// Infer service preset from drop-off/pick-up times when service_type is not recorded on the booking
export function inferPresetFromTimes(
  dropOff: string | null,
  pickUp: string | null,
  isBoarding: boolean
): ServicePreset | null {
  if (isBoarding) return SERVICE_PRESETS.find(p => p.name === 'Overnight Care') ?? null
  if (!dropOff || !pickUp) return null
  const [dh, dm] = dropOff.split(':').map(Number)
  const [ph, pm] = pickUp.split(':').map(Number)
  const duration = (ph * 60 + pm) - (dh * 60 + dm)
  if (duration <= 240) return SERVICE_PRESETS.find(p => p.name === 'Half Day Care') ?? null
  if (duration <= 480) return SERVICE_PRESETS.find(p => p.name === 'Full Day Care') ?? null
  return SERVICE_PRESETS.find(p => p.name === 'Long Day Care') ?? null
}

// Group consecutive items that share the same key, preserving order
export function groupConsecutive<T>(items: T[], getKey: (item: T) => string): Array<{ key: string; items: T[] }> {
  const groups: Array<{ key: string; items: T[] }> = []
  for (const item of items) {
    const key = getKey(item)
    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.items.push(item)
    } else {
      groups.push({ key, items: [item] })
    }
  }
  return groups
}

// Build service lines from a booking, splitting into separate lines for peak/standard days.
// Boarding: each "night" is attributed to its start date (e.g. Saturday night = peak).
// Daycare: each day is checked individually.
export function buildServiceLines(
  preset: ServicePreset,
  booking: { start_date: string; end_date: string | null; drop_off_time?: string | null; pick_up_time?: string | null },
  uid: () => string
): ServiceLine[] {
  if (preset.type === 'boarding') {
    const nights: string[] = []
    let cur = booking.start_date
    const end = booking.end_date ?? ''
    while (end && cur < end) {
      nights.push(cur)
      cur = addDays(cur, 1)
    }
    if (nights.length === 0) return []

    const lines: ServiceLine[] = groupConsecutive(nights, d => isPeakDate(d) ? 'peak' : 'standard').map(group => {
      const peak = group.key === 'peak'
      return {
        id: uid(),
        type: 'boarding' as const,
        description: `${preset.name} (${peak ? 'Peak Rate' : 'Standard Rate'})`,
        startDate: group.items[0],
        endDate: addDays(group.items[group.items.length - 1], 1),
        quantity: 1,
        rate: peak ? preset.peak : preset.standard,
      }
    })

    // If pick-up is more than 3 hours after drop-off, charge a daycare session on the pick-up day
    const dropOff = booking.drop_off_time
    const pickUp = booking.pick_up_time
    if (dropOff && pickUp && end) {
      const [dh, dm] = dropOff.split(':').map(Number)
      const [ph, pm] = pickUp.split(':').map(Number)
      const diffMins = (ph * 60 + pm) - (dh * 60 + dm)
      if (diffMins > 180) {
        const daycarePreset = inferPresetFromTimes(dropOff, pickUp, false)
        if (daycarePreset) {
          const peak = isPeakDate(end)
          lines.push({
            id: uid(),
            type: 'daycare' as const,
            description: `${daycarePreset.name} (${peak ? 'Peak Rate' : 'Standard Rate'})`,
            startDate: end,
            endDate: '',
            quantity: 1,
            rate: peak ? daycarePreset.peak : daycarePreset.standard,
          })
        }
      }
    }

    return lines
  } else {
    const dates: string[] = []
    let cur = booking.start_date
    const end = booking.end_date ?? booking.start_date
    while (cur <= end) {
      dates.push(cur)
      cur = addDays(cur, 1)
    }

    return groupConsecutive(dates, d => isPeakDate(d) ? 'peak' : 'standard').map(group => {
      const peak = group.key === 'peak'
      return {
        id: uid(),
        type: 'daycare' as const,
        description: `${preset.name} (${peak ? 'Peak Rate' : 'Standard Rate'})`,
        startDate: group.items[0],
        endDate: '',
        quantity: group.items.length,
        rate: peak ? preset.peak : preset.standard,
      }
    })
  }
}
