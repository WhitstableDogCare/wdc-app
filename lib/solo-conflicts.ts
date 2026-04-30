/**
 * Pure logic for Solo dog conflict detection.
 * Extracted from the API route so it can be unit-tested without Prisma.
 */

/**
 * Returns true if a non-recurring booking with [bookingStart, bookingEnd]
 * overlaps the date range [rangeStart, rangeEnd].
 * All dates are 'YYYY-MM-DD' strings.
 * If bookingEnd is null the booking is treated as a single-day booking (bookingStart only).
 */
export function nonRecurringOverlaps(
  bookingStart: string,
  bookingEnd: string | null,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  // booking must start on or before range ends
  if (bookingStart > rangeEnd) return false
  // booking must end on or after range starts
  const effectiveEnd = bookingEnd ?? bookingStart
  if (effectiveEnd < rangeStart) return false
  return true
}

/**
 * Builds the set of JS day-of-week numbers (0=Sun … 6=Sat) covered by
 * the date range [start, end] (inclusive), capped at 7 distinct days.
 * Dates are 'YYYY-MM-DD' strings.
 */
export function coveredWeekdays(start: string, end: string): Set<number> {
  const startD = new Date(start + 'T12:00:00')
  const endD   = new Date(end   + 'T12:00:00')
  const days   = Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1
  const result = new Set<number>()
  for (let i = 0; i < Math.min(days, 7); i++) {
    const d = new Date(startD)
    d.setDate(d.getDate() + i)
    result.add(d.getDay())
  }
  return result
}

/**
 * Returns true if any of the provided recurring bookings (each with a day_of_week)
 * falls on a day covered by [rangeStart, rangeEnd].
 */
export function recurringConflicts(
  recurringBookings: { day_of_week: number | null }[],
  rangeStart: string,
  rangeEnd: string,
): boolean {
  const covered = coveredWeekdays(rangeStart, rangeEnd)
  return recurringBookings.some(b => b.day_of_week != null && covered.has(b.day_of_week))
}
