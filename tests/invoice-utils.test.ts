import { describe, it, expect } from 'vitest'
import {
  inferPresetFromTimes, buildServiceLines, SERVICE_PRESETS,
  addDays, calcNights, serviceAmount, groupConsecutive,
  type ServiceLine,
} from '../lib/invoice-utils'

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

    describe('pickup-day daycare', () => {

      it('adds a Long Day Care line when pick-up is >3h after drop-off', () => {
        // Ernie's case: 8am drop-off, 6pm pick-up on 18th (10h gap)
        const lines = buildServiceLines(overnight, {
          start_date: '2026-06-17', end_date: '2026-06-18',
          drop_off_time: '08:00', pick_up_time: '18:00',
        }, uid)
        expect(lines).toHaveLength(2)
        expect(lines[0].type).toBe('boarding')
        expect(lines[1].type).toBe('daycare')
        expect(lines[1].description).toContain('Long Day Care')
        expect(lines[1].startDate).toBe('2026-06-18')
        expect(lines[1].quantity).toBe(1)
      })

      it('does not add daycare when pick-up is within 3h of drop-off', () => {
        // 8am drop-off, 10:30am pick-up = 2.5h gap — no extra charge
        const lines = buildServiceLines(overnight, {
          start_date: '2026-06-17', end_date: '2026-06-18',
          drop_off_time: '08:00', pick_up_time: '10:30',
        }, uid)
        expect(lines).toHaveLength(1)
        expect(lines[0].type).toBe('boarding')
      })

      it('does not add daycare when pick-up is exactly 3h after drop-off', () => {
        // 8am drop-off, 11am pick-up = exactly 3h — no extra charge
        const lines = buildServiceLines(overnight, {
          start_date: '2026-06-17', end_date: '2026-06-18',
          drop_off_time: '08:00', pick_up_time: '11:00',
        }, uid)
        expect(lines).toHaveLength(1)
      })

      it('adds a Full Day Care line when gap is between 4 and 8 hours', () => {
        // 9am drop-off, 4pm pick-up = 7h gap
        const lines = buildServiceLines(overnight, {
          start_date: '2026-06-17', end_date: '2026-06-18',
          drop_off_time: '09:00', pick_up_time: '16:00',
        }, uid)
        expect(lines).toHaveLength(2)
        expect(lines[1].description).toContain('Full Day Care')
      })

      it('does not add daycare when drop_off_time or pick_up_time is missing', () => {
        const lines = buildServiceLines(overnight, {
          start_date: '2026-06-17', end_date: '2026-06-18',
        }, uid)
        expect(lines).toHaveLength(1)
      })

      it('applies peak rate to daycare line when pickup day is peak', () => {
        // Weekend pickup — Sat 20 Jun 2026
        const lines = buildServiceLines(overnight, {
          start_date: '2026-06-19', end_date: '2026-06-20',
          drop_off_time: '08:00', pick_up_time: '18:00',
        }, uid)
        const daycareLines = lines.filter(l => l.type === 'daycare')
        expect(daycareLines).toHaveLength(1)
        expect(daycareLines[0].description).toContain('Peak Rate')
      })

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

// ─── addDays ─────────────────────────────────────────────────────────────────

describe('addDays', () => {

  it('adds 1 day correctly', () => {
    expect(addDays('2026-04-21', 1)).toBe('2026-04-22')
  })

  it('adds 7 days correctly', () => {
    expect(addDays('2026-04-21', 7)).toBe('2026-04-28')
  })

  it('handles month boundary', () => {
    expect(addDays('2026-04-30', 1)).toBe('2026-05-01')
  })

  it('handles year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('subtracts days with a negative value', () => {
    expect(addDays('2026-04-21', -1)).toBe('2026-04-20')
  })

  it('returns the same date when adding 0 days', () => {
    expect(addDays('2026-04-21', 0)).toBe('2026-04-21')
  })

})

// ─── calcNights ───────────────────────────────────────────────────────────────

describe('calcNights', () => {

  const makeLine = (overrides: Partial<ServiceLine>): ServiceLine => ({
    id: 'x', type: 'boarding', description: '', startDate: '', endDate: '', quantity: 1, rate: 50,
    ...overrides,
  })

  it('returns 0 for a boarding line where start equals end', () => {
    const line = makeLine({ startDate: '2026-04-21', endDate: '2026-04-21' })
    expect(calcNights(line)).toBe(0)
  })

  it('returns correct night count for a 2-night boarding stay', () => {
    const line = makeLine({ startDate: '2026-04-21', endDate: '2026-04-23' })
    expect(calcNights(line)).toBe(2)
  })

  it('returns correct night count for a 7-night boarding stay', () => {
    const line = makeLine({ startDate: '2026-04-21', endDate: '2026-04-28' })
    expect(calcNights(line)).toBe(7)
  })

  it('falls back to quantity when boarding endDate is empty string', () => {
    const line = makeLine({ type: 'boarding', startDate: '2026-04-21', endDate: '', quantity: 3 })
    expect(calcNights(line)).toBe(3)
  })

  it('always returns quantity for daycare regardless of dates', () => {
    const line = makeLine({ type: 'daycare', quantity: 4, startDate: '2026-04-21', endDate: '2026-04-25' })
    expect(calcNights(line)).toBe(4)
  })

  it('never returns a negative value', () => {
    // end before start — treated as 0
    const line = makeLine({ startDate: '2026-04-25', endDate: '2026-04-21' })
    expect(calcNights(line)).toBe(0)
  })

})

// ─── serviceAmount ────────────────────────────────────────────────────────────

describe('serviceAmount', () => {

  it('returns nights × rate for a boarding line', () => {
    const line: ServiceLine = { id: 'x', type: 'boarding', description: '', startDate: '2026-04-21', endDate: '2026-04-24', quantity: 1, rate: 50 }
    expect(serviceAmount(line)).toBe(150) // 3 nights × £50
  })

  it('returns quantity × rate for a daycare line', () => {
    const line: ServiceLine = { id: 'x', type: 'daycare', description: '', startDate: '2026-04-21', endDate: '', quantity: 3, rate: 30 }
    expect(serviceAmount(line)).toBe(90) // 3 days × £30
  })

  it('returns 0 when boarding start equals end', () => {
    const line: ServiceLine = { id: 'x', type: 'boarding', description: '', startDate: '2026-04-21', endDate: '2026-04-21', quantity: 1, rate: 50 }
    expect(serviceAmount(line)).toBe(0)
  })

  it('handles peak rate correctly', () => {
    const line: ServiceLine = { id: 'x', type: 'boarding', description: '', startDate: '2026-04-25', endDate: '2026-04-26', quantity: 1, rate: 60 }
    expect(serviceAmount(line)).toBe(60) // 1 night × £60
  })

})

// ─── groupConsecutive ─────────────────────────────────────────────────────────

describe('groupConsecutive', () => {

  it('returns empty array for empty input', () => {
    expect(groupConsecutive([], (x: string) => x)).toEqual([])
  })

  it('returns single group for a single item', () => {
    const result = groupConsecutive(['a'], (x) => x)
    expect(result).toEqual([{ key: 'a', items: ['a'] }])
  })

  it('groups all items into one group when they share the same key', () => {
    const result = groupConsecutive(['a', 'b', 'c'], () => 'same')
    expect(result).toHaveLength(1)
    expect(result[0].items).toEqual(['a', 'b', 'c'])
  })

  it('creates separate groups for items with different keys', () => {
    const result = groupConsecutive(['a', 'b'], (x) => x)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ key: 'a', items: ['a'] })
    expect(result[1]).toEqual({ key: 'b', items: ['b'] })
  })

  it('groups consecutive runs and keeps non-consecutive ones separate', () => {
    // standard, standard, peak, standard — 3 groups
    const items = ['std', 'std', 'peak', 'std']
    const result = groupConsecutive(items, (x) => x)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ key: 'std', items: ['std', 'std'] })
    expect(result[1]).toEqual({ key: 'peak', items: ['peak'] })
    expect(result[2]).toEqual({ key: 'std', items: ['std'] })
  })

  it('works with numeric keys', () => {
    const items = [1, 1, 2, 2, 1]
    const result = groupConsecutive(items, (x) => String(x))
    expect(result).toHaveLength(3)
    expect(result[0].items).toEqual([1, 1])
    expect(result[1].items).toEqual([2, 2])
    expect(result[2].items).toEqual([1])
  })

})
