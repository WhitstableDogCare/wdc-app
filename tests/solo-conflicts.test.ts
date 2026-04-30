import { describe, it, expect } from 'vitest'
import { nonRecurringOverlaps, coveredWeekdays, recurringConflicts } from '../lib/solo-conflicts'

describe('nonRecurringOverlaps', () => {

  describe('clear non-overlaps', () => {
    it('returns false when booking ends before range starts', () => {
      expect(nonRecurringOverlaps('2026-04-10', '2026-04-15', '2026-04-20', '2026-04-25')).toBe(false)
    })
    it('returns false when booking starts after range ends', () => {
      expect(nonRecurringOverlaps('2026-05-01', '2026-05-05', '2026-04-20', '2026-04-25')).toBe(false)
    })
    it('returns false for single-day booking before range (null end)', () => {
      expect(nonRecurringOverlaps('2026-04-10', null, '2026-04-20', '2026-04-25')).toBe(false)
    })
    it('returns false for single-day booking after range (null end)', () => {
      expect(nonRecurringOverlaps('2026-04-30', null, '2026-04-20', '2026-04-25')).toBe(false)
    })
  })

  describe('clear overlaps', () => {
    it('returns true when booking fully contains the range', () => {
      expect(nonRecurringOverlaps('2026-04-01', '2026-04-30', '2026-04-10', '2026-04-20')).toBe(true)
    })
    it('returns true when booking is fully inside the range', () => {
      expect(nonRecurringOverlaps('2026-04-12', '2026-04-18', '2026-04-10', '2026-04-20')).toBe(true)
    })
    it('returns true when booking starts inside and ends after range', () => {
      expect(nonRecurringOverlaps('2026-04-15', '2026-04-28', '2026-04-10', '2026-04-20')).toBe(true)
    })
    it('returns true when booking starts before and ends inside range', () => {
      expect(nonRecurringOverlaps('2026-04-05', '2026-04-15', '2026-04-10', '2026-04-20')).toBe(true)
    })
    it('returns true for single-day booking inside range (null end)', () => {
      expect(nonRecurringOverlaps('2026-04-15', null, '2026-04-10', '2026-04-20')).toBe(true)
    })
  })

  describe('boundary conditions', () => {
    it('returns true when booking ends exactly on range start (same day)', () => {
      expect(nonRecurringOverlaps('2026-04-05', '2026-04-10', '2026-04-10', '2026-04-20')).toBe(true)
    })
    it('returns true when booking starts exactly on range end (same day)', () => {
      expect(nonRecurringOverlaps('2026-04-20', '2026-04-25', '2026-04-10', '2026-04-20')).toBe(true)
    })
    it('returns true when booking is exactly one day matching range (same start and end)', () => {
      expect(nonRecurringOverlaps('2026-04-15', '2026-04-15', '2026-04-15', '2026-04-15')).toBe(true)
    })
    it('returns false when booking ends day before range starts', () => {
      expect(nonRecurringOverlaps('2026-04-05', '2026-04-09', '2026-04-10', '2026-04-20')).toBe(false)
    })
    it('returns false when booking starts day after range ends', () => {
      expect(nonRecurringOverlaps('2026-04-21', '2026-04-25', '2026-04-10', '2026-04-20')).toBe(false)
    })
  })

})

describe('coveredWeekdays', () => {

  it('returns just Monday for a single Monday', () => {
    // 2026-04-27 is a Monday (day 1)
    const days = coveredWeekdays('2026-04-27', '2026-04-27')
    expect(days).toEqual(new Set([1]))
  })

  it('returns Mon–Fri for a 5-day week', () => {
    // 2026-04-27 Mon → 2026-05-01 Fri
    const days = coveredWeekdays('2026-04-27', '2026-05-01')
    expect(days).toEqual(new Set([1, 2, 3, 4, 5]))
  })

  it('returns all 7 days for a full week', () => {
    const days = coveredWeekdays('2026-04-27', '2026-05-03')
    expect(days.size).toBe(7)
    expect(days).toEqual(new Set([0, 1, 2, 3, 4, 5, 6]))
  })

  it('caps at 7 days even for a longer range', () => {
    const days = coveredWeekdays('2026-04-01', '2026-04-30')
    expect(days.size).toBe(7)
  })

  it('returns Sat and Sun for a weekend', () => {
    // 2026-05-02 Sat, 2026-05-03 Sun
    const days = coveredWeekdays('2026-05-02', '2026-05-03')
    expect(days).toEqual(new Set([6, 0]))
  })

})

describe('recurringConflicts', () => {

  describe('no conflicts', () => {
    it('returns false when there are no recurring bookings', () => {
      expect(recurringConflicts([], '2026-04-27', '2026-04-29')).toBe(false)
    })
    it('returns false when recurring day is not covered by the range', () => {
      // Range: Mon 27 Apr – Wed 29 Apr (covers days 1,2,3)
      // Recurring on Friday (5)
      expect(recurringConflicts([{ day_of_week: 5 }], '2026-04-27', '2026-04-29')).toBe(false)
    })
    it('returns false when day_of_week is null', () => {
      expect(recurringConflicts([{ day_of_week: null }], '2026-04-27', '2026-05-03')).toBe(false)
    })
  })

  describe('conflicts detected', () => {
    it('returns true when recurring day falls within the range', () => {
      // Range: Mon 27 Apr – Wed 29 Apr (covers Mon=1, Tue=2, Wed=3)
      // Recurring on Wednesday (3)
      expect(recurringConflicts([{ day_of_week: 3 }], '2026-04-27', '2026-04-29')).toBe(true)
    })
    it('returns true when one of multiple recurring bookings conflicts', () => {
      // Range: Mon only (day 1)
      const bookings = [{ day_of_week: 5 }, { day_of_week: 1 }, { day_of_week: 6 }]
      expect(recurringConflicts(bookings, '2026-04-27', '2026-04-27')).toBe(true)
    })
    it('returns true for a weekend range containing a Saturday recurring booking', () => {
      // Range: Sat 2 May – Sun 3 May (covers 6, 0)
      expect(recurringConflicts([{ day_of_week: 6 }], '2026-05-02', '2026-05-03')).toBe(true)
    })
    it('returns true when range spans more than a week and day would be covered', () => {
      // Full week range covers all days
      expect(recurringConflicts([{ day_of_week: 0 }], '2026-04-27', '2026-05-10')).toBe(true)
    })
  })

  describe('single-day range', () => {
    it('returns true when recurring day matches the single day', () => {
      // 2026-04-27 is Monday (1)
      expect(recurringConflicts([{ day_of_week: 1 }], '2026-04-27', '2026-04-27')).toBe(true)
    })
    it('returns false when recurring day does not match the single day', () => {
      // 2026-04-27 is Monday (1), recurring is Tuesday (2)
      expect(recurringConflicts([{ day_of_week: 2 }], '2026-04-27', '2026-04-27')).toBe(false)
    })
  })

})
