/**
 * Peak rate detection for Whitstable Dog Care invoicing.
 *
 * A date is charged at PEAK rate if it falls on:
 *   • A weekend (Saturday or Sunday)
 *   • A UK public holiday
 *   • A school inset day (children off, even within a term)
 *   • A school holiday (i.e. not within any term date range)
 *
 * STANDARD rate applies to weekday term-time dates only.
 *
 * Update TERM_DATES and INSET_DAYS at the start of each academic year.
 */

// ---------------------------------------------------------------------------
// Term dates — school is in session during these inclusive date ranges
// ---------------------------------------------------------------------------
const TERM_DATES: Array<{ start: string; end: string; label: string }> = [
  // 2025–2026
  { start: '2025-09-01', end: '2025-10-17', label: '2025-26 Term 1' },
  { start: '2025-10-27', end: '2025-12-19', label: '2025-26 Term 2' },
  { start: '2026-01-05', end: '2026-02-13', label: '2025-26 Term 3' },
  { start: '2026-02-23', end: '2026-04-02', label: '2025-26 Term 4' },
  { start: '2026-04-20', end: '2026-05-22', label: '2025-26 Term 5' },
  { start: '2026-06-01', end: '2026-07-21', label: '2025-26 Term 6' },
  // 2026–2027 (proposed Kent County Council dates)
  { start: '2026-09-01', end: '2026-10-23', label: '2026-27 Term 1' },
  { start: '2026-11-02', end: '2026-12-18', label: '2026-27 Term 2' },
  { start: '2027-01-04', end: '2027-02-12', label: '2026-27 Term 3' },
  { start: '2027-02-22', end: '2027-03-25', label: '2026-27 Term 4' },
  { start: '2027-04-12', end: '2027-05-28', label: '2026-27 Term 5' },
  { start: '2027-06-07', end: '2027-07-21', label: '2026-27 Term 6' },
]

// ---------------------------------------------------------------------------
// Inset days — children are off even though the date falls within a term
// ---------------------------------------------------------------------------
const INSET_DAYS = new Set([
  // 2025–2026
  '2025-09-01', // Term 1 start — inset day
  '2025-10-27', // Term 2 start — inset day
  '2025-11-24', // Mid-term inset
  '2026-07-20', // Term 6 final days — inset
  '2026-07-21',
])

// ---------------------------------------------------------------------------
// UK public holidays
// Note: holidays that fall during school holidays are already peak, but
// including them ensures correctness if term dates ever change.
// ---------------------------------------------------------------------------
const PUBLIC_HOLIDAYS = new Set([
  // 2025
  '2025-08-25', // Summer Bank Holiday
  '2025-12-25', // Christmas Day
  '2025-12-26', // Boxing Day
  // 2026
  '2026-01-01', // New Year's Day
  '2026-04-03', // Good Friday
  '2026-04-06', // Easter Monday
  '2026-05-04', // Early May Bank Holiday
  '2026-05-25', // Spring Bank Holiday
  '2026-08-31', // Summer Bank Holiday
  '2026-12-25', // Christmas Day
  '2026-12-28', // Boxing Day (substitute — 26th is Saturday)
  // 2027
  '2027-01-01', // New Year's Day
  '2027-05-03', // Early May Bank Holiday (falls in Term 5 — important)
  '2027-05-31', // Spring Bank Holiday
  '2027-08-30', // Summer Bank Holiday
  '2027-12-27', // Christmas Day (substitute — 25th is Saturday)
  '2027-12-28', // Boxing Day (substitute — 26th is Sunday)
  // NOTE: Easter 2027 dates fall during school holidays (Term 4 ends 25 Mar,
  // Term 5 starts 12 Apr) so are already peak regardless.
])

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Returns true if the given date (YYYY-MM-DD) should be invoiced at peak rate.
 *
 * For multi-day boarding bookings, pass the start date — the assumption is
 * that a booking is peak if it begins during a peak period. The invoice form
 * allows manual adjustment if needed.
 */
export function isPeakDate(dateStr: string): boolean {
  const date = new Date(dateStr + 'T12:00:00')
  const day = date.getDay() // 0 = Sunday, 6 = Saturday

  // Weekends
  if (day === 0 || day === 6) return true

  // Public holidays
  if (PUBLIC_HOLIDAYS.has(dateStr)) return true

  // Inset days (checked before term-date range so they override correctly)
  if (INSET_DAYS.has(dateStr)) return true

  // Within a term → standard; outside all terms → school holiday → peak
  const inTerm = TERM_DATES.some(t => dateStr >= t.start && dateStr <= t.end)
  return !inTerm
}
