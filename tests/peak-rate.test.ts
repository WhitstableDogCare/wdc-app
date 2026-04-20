import { describe, it, expect } from 'vitest'
import { isPeakDate } from '../lib/peak-rate'

describe('isPeakDate', () => {

  describe('weekends', () => {
    it('returns true for a Saturday', () => {
      expect(isPeakDate('2026-04-25')).toBe(true) // Saturday
    })
    it('returns true for a Sunday', () => {
      expect(isPeakDate('2026-04-26')).toBe(true) // Sunday
    })
    it('returns false for a Monday in term time', () => {
      expect(isPeakDate('2026-04-21')).toBe(false) // Monday, Term 5
    })
  })

  describe('term time (standard rate)', () => {
    it('returns false for a weekday in Term 1 2025', () => {
      expect(isPeakDate('2025-09-10')).toBe(false) // Wednesday
    })
    it('returns false for a weekday in Term 3 2026', () => {
      expect(isPeakDate('2026-01-14')).toBe(false) // Wednesday
    })
    it('returns false for a weekday in Term 5 2026', () => {
      expect(isPeakDate('2026-05-06')).toBe(false) // Wednesday
    })
    it('returns false for a weekday in Term 6 2026', () => {
      expect(isPeakDate('2026-06-10')).toBe(false) // Wednesday
    })
    it('returns false for the last weekday of Term 5', () => {
      expect(isPeakDate('2026-05-22')).toBe(false) // Friday, last day of Term 5
    })
  })

  describe('school holidays (peak rate)', () => {
    it('returns true for autumn half term (Oct 2025)', () => {
      expect(isPeakDate('2025-10-22')).toBe(true) // Wednesday of half term
    })
    it('returns true for Christmas holidays', () => {
      expect(isPeakDate('2025-12-24')).toBe(true) // Christmas Eve, holiday
    })
    it('returns true for February half term 2026', () => {
      expect(isPeakDate('2026-02-18')).toBe(true) // Wednesday of half term
    })
    it('returns true for Easter holidays 2026', () => {
      expect(isPeakDate('2026-04-08')).toBe(true) // Wednesday of Easter holiday
    })
    it('returns true for May half term 2026', () => {
      expect(isPeakDate('2026-05-27')).toBe(true) // Wednesday of half term
    })
    it('returns true for summer holidays 2026', () => {
      expect(isPeakDate('2026-08-05')).toBe(true) // Wednesday in summer
    })
  })

  describe('inset days', () => {
    it('returns true for 1 Sep 2025 (inset day, start of Term 1)', () => {
      expect(isPeakDate('2025-09-01')).toBe(true)
    })
    it('returns true for 27 Oct 2025 (inset day, start of Term 2)', () => {
      expect(isPeakDate('2025-10-27')).toBe(true)
    })
    it('returns true for 24 Nov 2025 (mid-term inset day)', () => {
      expect(isPeakDate('2025-11-24')).toBe(true)
    })
    it('returns true for 20 Jul 2026 (inset day, end of Term 6)', () => {
      expect(isPeakDate('2026-07-20')).toBe(true)
    })
    it('returns true for 21 Jul 2026 (inset day, end of Term 6)', () => {
      expect(isPeakDate('2026-07-21')).toBe(true)
    })
    it('returns false for the day after an inset day (normal term time)', () => {
      expect(isPeakDate('2025-09-02')).toBe(false) // Tuesday, normal term day
    })
  })

  describe('public holidays', () => {
    it('returns true for Christmas Day 2025', () => {
      expect(isPeakDate('2025-12-25')).toBe(true)
    })
    it('returns true for Boxing Day 2025', () => {
      expect(isPeakDate('2025-12-26')).toBe(true)
    })
    it('returns true for New Year\'s Day 2026', () => {
      expect(isPeakDate('2026-01-01')).toBe(true)
    })
    it('returns true for Good Friday 2026', () => {
      expect(isPeakDate('2026-04-03')).toBe(true)
    })
    it('returns true for Easter Monday 2026', () => {
      expect(isPeakDate('2026-04-06')).toBe(true)
    })
    it('returns true for Early May Bank Holiday 2026', () => {
      expect(isPeakDate('2026-05-04')).toBe(true)
    })
    it('returns true for Spring Bank Holiday 2026 (in half term)', () => {
      expect(isPeakDate('2026-05-25')).toBe(true)
    })
    it('returns true for Early May Bank Holiday 2027 (falls in Term 5)', () => {
      expect(isPeakDate('2027-05-03')).toBe(true)
    })
  })

  describe('2026-27 term dates', () => {
    it('returns false for a weekday in Term 1 2026-27', () => {
      expect(isPeakDate('2026-09-16')).toBe(false) // Wednesday
    })
    it('returns true for autumn half term 2026-27', () => {
      expect(isPeakDate('2026-10-28')).toBe(true) // Wednesday of half term
    })
    it('returns false for a weekday in Term 2 2026-27', () => {
      expect(isPeakDate('2026-11-11')).toBe(false) // Wednesday
    })
    it('returns true for Christmas holidays 2026-27', () => {
      expect(isPeakDate('2026-12-23')).toBe(true) // Wednesday
    })
  })

})
