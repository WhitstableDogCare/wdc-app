import { describe, it, expect } from 'vitest'

// Same logic used in new/page.tsx and [id]/edit/page.tsx
interface UnavailablePeriod {
  id: number
  start_date: string
  end_date: string
  reason: string
}

function findOverlap(bookingStart: string, bookingEnd: string, periods: UnavailablePeriod[]): UnavailablePeriod | undefined {
  return periods.find(p => bookingStart <= p.end_date && bookingEnd >= p.start_date)
}

const holiday: UnavailablePeriod = { id: 1, start_date: '2026-06-10', end_date: '2026-06-17', reason: 'Holiday' }

describe('unavailable period overlap', () => {

  // ─── No overlap ──────────────────────────────────────────────────────────────

  it('returns undefined when booking is entirely before the period', () => {
    expect(findOverlap('2026-06-01', '2026-06-05', [holiday])).toBeUndefined()
  })

  it('returns undefined when booking ends the day before the period starts', () => {
    expect(findOverlap('2026-06-08', '2026-06-09', [holiday])).toBeUndefined()
  })

  it('returns undefined when booking is entirely after the period', () => {
    expect(findOverlap('2026-06-20', '2026-06-25', [holiday])).toBeUndefined()
  })

  it('returns undefined when booking starts the day after the period ends', () => {
    expect(findOverlap('2026-06-18', '2026-06-20', [holiday])).toBeUndefined()
  })

  // ─── Overlap ─────────────────────────────────────────────────────────────────

  it('returns the period when booking starts inside it', () => {
    expect(findOverlap('2026-06-14', '2026-06-20', [holiday])).toBe(holiday)
  })

  it('returns the period when booking ends inside it', () => {
    expect(findOverlap('2026-06-07', '2026-06-12', [holiday])).toBe(holiday)
  })

  it('returns the period when booking is entirely within it', () => {
    expect(findOverlap('2026-06-12', '2026-06-15', [holiday])).toBe(holiday)
  })

  it('returns the period when booking spans the entire period', () => {
    expect(findOverlap('2026-06-01', '2026-06-30', [holiday])).toBe(holiday)
  })

  it('returns the period when booking exactly matches it', () => {
    expect(findOverlap('2026-06-10', '2026-06-17', [holiday])).toBe(holiday)
  })

  it('returns the period when booking starts on the first day of it', () => {
    expect(findOverlap('2026-06-10', '2026-06-10', [holiday])).toBe(holiday)
  })

  it('returns the period when booking falls on the last day of it', () => {
    expect(findOverlap('2026-06-17', '2026-06-17', [holiday])).toBe(holiday)
  })

  // ─── Single-day booking (daycare) ────────────────────────────────────────────

  it('returns the period for a single-day booking inside it', () => {
    expect(findOverlap('2026-06-13', '2026-06-13', [holiday])).toBe(holiday)
  })

  it('returns undefined for a single-day booking outside it', () => {
    expect(findOverlap('2026-06-09', '2026-06-09', [holiday])).toBeUndefined()
  })

  // ─── Multiple periods ─────────────────────────────────────────────────────────

  it('returns the first matching period when multiple periods exist', () => {
    const illness: UnavailablePeriod = { id: 2, start_date: '2026-07-01', end_date: '2026-07-03', reason: 'Illness' }
    expect(findOverlap('2026-07-02', '2026-07-02', [holiday, illness])).toBe(illness)
  })

  it('returns undefined when no periods overlap', () => {
    const illness: UnavailablePeriod = { id: 2, start_date: '2026-07-01', end_date: '2026-07-03', reason: 'Illness' }
    expect(findOverlap('2026-06-20', '2026-06-25', [holiday, illness])).toBeUndefined()
  })

  it('returns undefined when periods list is empty', () => {
    expect(findOverlap('2026-06-13', '2026-06-13', [])).toBeUndefined()
  })

})
