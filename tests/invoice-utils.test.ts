import { describe, it, expect } from 'vitest'
import { inferPresetFromTimes, buildServiceLines, SERVICE_PRESETS } from '../lib/invoice-utils'

// Stable uid for tests — no randomness
const uid = () => 'test-id'

const overnight = SERVICE_PRESETS.find(p => p.name === 'Overnight Care')!
const halfDay   = SERVICE_PRESETS.find(p => p.name === 'Half Day Care')!
const fullDay   = SERVICE_PRESETS.find(p => p.name === 'Full Day Care')!
const longDay   = SERVICE_PRESETS.find(p => p.name === 'Long Day Care')!

// ─── inferPresetFromTimes ────────────────────────────────────────────────────

describe('inferPresetFromTimes', () => {

  it('returns Overnight Care for boarding regardless of times', () => {
    expect(inferPresetFromTimes('09:00', '17:00', true)?.name).toBe('Overnight Care')
    expect(inferPresetFromTimes(null, null, true)?.name).toBe('Overnight Care')
  })

  it('returns null when times are missing for daycare', () => {
    expect(inferPresetFromTimes(null, null, false)).toBeNull()
    expect(inferPresetFromTimes('09:00', null, false)).toBeNull()
  })

  it('returns Half Day Care for up to 4 hours', () => {
    expect(inferPresetFromTimes('09:00', '13:00', false)?.name).toBe('Half Day Care') // exactly 4h
    expect(inferPresetFromTimes('09:00', '11:00', false)?.name).toBe('Half Day Care') // 2h
    expect(inferPresetFromTimes('09:00', '09:00', false)?.name).toBe('Half Day Care') // 0 duration
  })

  it('returns Full Day Care for 4–8 hours', () => {
    expect(inferPresetFromTimes('09:00', '13:01', false)?.name).toBe('Full Day Care') // just over 4h
    expect(inferPresetFromTimes('09:00', '17:00', false)?.name).toBe('Full Day Care') // exactly 8h
  })

  it('returns Long Day Care for over 8 hours', () => {
    expect(inferPresetFromTimes('09:00', '17:01', false)?.name).toBe('Long Day Care') // just over 8h
    expect(inferPresetFromTimes('08:00', '20:00', false)?.name).toBe('Long Day Care') // 12h
  })

})

// ─── buildServiceLines ───────────────────────────────────────────────────────

describe('buildServiceLines', () => {

  describe('boarding', () => {

    it('returns empty array when start and end date are the same (0 nights)', () => {
      const lines = buildServiceLines(overnight, { start_date: '2026-04-21', end_date: '2026-04-21' }, uid)
      expect(lines).toHaveLength(0)
    })

    it('returns a single standard line for weekday term-time nights', () => {
      // Mon 21 Apr → Thu 23 Apr = 2 nights (Tue & Wed in term, both standard)
      // Actually Mon 20 Apr is start of Term 5 but it's an inset day check...
      // Let's use Wed 22 Apr → Fri 24 Apr = 2 nights (Wed, Thu — both term time weekdays)
      const lines = buildServiceLines(overnight, { start_date: '2026-04-22', end_date: '2026-04-24' }, uid)
      expect(lines).toHaveLength(1)
      expect(lines[0].description).toBe('Overnight Care (Standard Rate)')
      expect(lines[0].rate).toBe(50)
      expect(lines[0].startDate).toBe('2026-04-22')
      expect(lines[0].endDate).toBe('2026-04-24')
    })

    it('returns a single peak line for weekend nights', () => {
      // Sat 25 Apr → Mon 27 Apr = 2 nights (Sat, Sun — both peak)
      const lines = buildServiceLines(overnight, { start_date: '2026-04-25', end_date: '2026-04-27' }, uid)
      expect(lines).toHaveLength(1)
      expect(lines[0].description).toBe('Overnight Care (Peak Rate)')
      expect(lines[0].rate).toBe(60)
    })

    it('splits a Mon→Sun stay into standard weekdays + peak weekend', () => {
      // Mon 21 Apr → Sun 26 Apr 2026 (Term 5 weekdays = standard, Sat = peak)
      // Nights: Mon, Tue, Wed, Thu, Fri = standard; Sat = peak
      const lines = buildServiceLines(overnight, { start_date: '2026-04-21', end_date: '2026-04-26' }, uid)
      expect(lines).toHaveLength(2)
      expect(lines[0].description).toBe('Overnight Care (Standard Rate)')
      expect(lines[0].startDate).toBe('2026-04-21')
      expect(lines[0].endDate).toBe('2026-04-25') // 4 standard nights Mon–Fri
      expect(lines[1].description).toBe('Overnight Care (Peak Rate)')
      expect(lines[1].startDate).toBe('2026-04-25')
      expect(lines[1].endDate).toBe('2026-04-26') // 1 peak night Sat
    })

    it('treats a stay spanning into school holidays correctly', () => {
      // Fri 22 May (last day of Term 5) → Tue 26 May
      // Night of Fri 22 May → standard (last day of term, weekday)
      // Night of Sat 23 May → peak (weekend)
      // Night of Sun 24 May → peak (weekend)
      // Night of Mon 25 May → peak (Spring Bank Holiday + half term)
      const lines = buildServiceLines(overnight, { start_date: '2026-05-22', end_date: '2026-05-26' }, uid)
      expect(lines).toHaveLength(2)
      expect(lines[0].description).toBe('Overnight Care (Standard Rate)')
      expect(lines[0].startDate).toBe('2026-05-22')
      expect(lines[0].endDate).toBe('2026-05-23')
      expect(lines[1].description).toBe('Overnight Care (Peak Rate)')
      expect(lines[1].startDate).toBe('2026-05-23')
      expect(lines[1].endDate).toBe('2026-05-26')
    })

    it('handles null end_date gracefully', () => {
      const lines = buildServiceLines(overnight, { start_date: '2026-04-21', end_date: null }, uid)
      expect(lines).toHaveLength(0)
    })

  })

  describe('daycare', () => {

    it('returns a single standard line for a weekday in term time', () => {
      const lines = buildServiceLines(fullDay, { start_date: '2026-04-21', end_date: null }, uid)
      expect(lines).toHaveLength(1)
      expect(lines[0].description).toBe('Full Day Care (Standard Rate)')
      expect(lines[0].rate).toBe(30)
      expect(lines[0].quantity).toBe(1)
    })

    it('returns a single peak line for a weekend day', () => {
      const lines = buildServiceLines(halfDay, { start_date: '2026-04-25', end_date: null }, uid)
      expect(lines).toHaveLength(1)
      expect(lines[0].description).toBe('Half Day Care (Peak Rate)')
      expect(lines[0].rate).toBe(25)
    })

    it('splits multi-day daycare spanning a weekend', () => {
      // Fri 24 Apr → Sun 26 Apr: Fri = standard, Sat & Sun = peak
      const lines = buildServiceLines(fullDay, { start_date: '2026-04-24', end_date: '2026-04-26' }, uid)
      expect(lines).toHaveLength(2)
      expect(lines[0].description).toBe('Full Day Care (Standard Rate)')
      expect(lines[0].quantity).toBe(1) // Friday
      expect(lines[1].description).toBe('Full Day Care (Peak Rate)')
      expect(lines[1].quantity).toBe(2) // Saturday + Sunday
    })

    it('returns correct rates for Long Day Care', () => {
      const lines = buildServiceLines(longDay, { start_date: '2026-04-25', end_date: null }, uid) // Saturday
      expect(lines[0].rate).toBe(50) // peak rate for Long Day Care
    })

  })

})
