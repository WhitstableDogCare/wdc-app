import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    dogConflict: { findMany: vi.fn() },
    booking: { findFirst: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { GET } from '../app/api/bookings/conflicts/route'
import type { NextRequest } from 'next/server'

// Build a fake NextRequest with search params — avoids any edge-runtime issues
const makeReq = (params: Record<string, string>) =>
  ({ nextUrl: { searchParams: new URLSearchParams(params) } } as unknown as NextRequest)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/bookings/conflicts', () => {

  // ─── Missing params ────────────────────────────────────────────────────────

  it('returns [] when dogId is missing', async () => {
    const data = await (await GET(makeReq({ start: '2026-04-21' }))).json()
    expect(data).toEqual([])
    expect(prisma.dogConflict.findMany).not.toHaveBeenCalled()
  })

  it('returns [] when start is missing', async () => {
    const data = await (await GET(makeReq({ dogId: '1' }))).json()
    expect(data).toEqual([])
    expect(prisma.dogConflict.findMany).not.toHaveBeenCalled()
  })

  // ─── No conflicts configured ───────────────────────────────────────────────

  it('returns [] when no dog conflicts exist in either direction', async () => {
    vi.mocked(prisma.dogConflict.findMany)
      .mockResolvedValueOnce([] as never[]) // as dog1
      .mockResolvedValueOnce([] as never[]) // as dog2

    const data = await (await GET(makeReq({ dogId: '1', start: '2026-04-21', end: '2026-04-25' }))).json()
    expect(data).toEqual([])
    expect(prisma.booking.findFirst).not.toHaveBeenCalled()
  })

  // ─── Conflicting dogs with no overlap ─────────────────────────────────────

  it('returns [] when conflicting dog has no overlapping confirmed booking', async () => {
    vi.mocked(prisma.dogConflict.findMany)
      .mockResolvedValueOnce([{ dog_id_2: 2, dog2: { id: 2, name: 'Max' }, notes: null }] as never[])
      .mockResolvedValueOnce([] as never[])
    vi.mocked(prisma.booking.findFirst).mockResolvedValueOnce(null as never)

    const data = await (await GET(makeReq({ dogId: '1', start: '2026-04-21', end: '2026-04-25' }))).json()
    expect(data).toEqual([])
  })

  // ─── Conflict detected as dog1 ────────────────────────────────────────────

  it('returns a warning when a conflict (as dog1 relation) has an overlapping booking', async () => {
    vi.mocked(prisma.dogConflict.findMany)
      .mockResolvedValueOnce([
        { dog_id_2: 2, dog2: { id: 2, name: 'Max' }, notes: 'They fight' },
      ] as never[])
      .mockResolvedValueOnce([] as never[])
    vi.mocked(prisma.booking.findFirst).mockResolvedValueOnce({ id: 99 } as never)

    const data = await (await GET(makeReq({ dogId: '1', start: '2026-04-21', end: '2026-04-25' }))).json()
    expect(data).toHaveLength(1)
    expect(data[0].dogName).toBe('Max')
    expect(data[0].notes).toBe('They fight')
  })

  // ─── Conflict detected as dog2 ────────────────────────────────────────────

  it('returns a warning when a conflict (as dog2 relation) has an overlapping booking', async () => {
    vi.mocked(prisma.dogConflict.findMany)
      .mockResolvedValueOnce([] as never[])
      .mockResolvedValueOnce([
        { dog_id_1: 3, dog1: { id: 3, name: 'Rocky' }, notes: 'Reactive' },
      ] as never[])
    vi.mocked(prisma.booking.findFirst).mockResolvedValueOnce({ id: 88 } as never)

    const data = await (await GET(makeReq({ dogId: '5', start: '2026-04-21', end: '2026-04-25' }))).json()
    expect(data).toHaveLength(1)
    expect(data[0].dogName).toBe('Rocky')
    expect(data[0].notes).toBe('Reactive')
  })

  // ─── Null notes ───────────────────────────────────────────────────────────

  it('includes null notes when no notes are recorded for the conflict', async () => {
    vi.mocked(prisma.dogConflict.findMany)
      .mockResolvedValueOnce([
        { dog_id_2: 2, dog2: { id: 2, name: 'Biscuit' }, notes: null },
      ] as never[])
      .mockResolvedValueOnce([] as never[])
    vi.mocked(prisma.booking.findFirst).mockResolvedValueOnce({ id: 1 } as never)

    const data = await (await GET(makeReq({ dogId: '1', start: '2026-04-21', end: '2026-04-25' }))).json()
    expect(data[0].notes).toBeNull()
  })

  // ─── Multiple conflicting dogs ────────────────────────────────────────────

  it('returns all warnings when multiple conflicting dogs have overlapping bookings', async () => {
    vi.mocked(prisma.dogConflict.findMany)
      .mockResolvedValueOnce([
        { dog_id_2: 2, dog2: { id: 2, name: 'Max' }, notes: null },
        { dog_id_2: 3, dog2: { id: 3, name: 'Rex' }, notes: null },
      ] as never[])
      .mockResolvedValueOnce([] as never[])
    vi.mocked(prisma.booking.findFirst)
      .mockResolvedValueOnce({ id: 1 } as never)  // Max overlaps
      .mockResolvedValueOnce({ id: 2 } as never)  // Rex overlaps

    const data = await (await GET(makeReq({ dogId: '1', start: '2026-04-21', end: '2026-04-25' }))).json()
    expect(data).toHaveLength(2)
    const names = data.map((d: { dogName: string }) => d.dogName)
    expect(names).toContain('Max')
    expect(names).toContain('Rex')
  })

  it('returns only dogs that actually overlap (skips non-overlapping conflicts)', async () => {
    vi.mocked(prisma.dogConflict.findMany)
      .mockResolvedValueOnce([
        { dog_id_2: 2, dog2: { id: 2, name: 'Max' }, notes: null },
        { dog_id_2: 3, dog2: { id: 3, name: 'Rex' }, notes: null },
      ] as never[])
      .mockResolvedValueOnce([] as never[])
    vi.mocked(prisma.booking.findFirst)
      .mockResolvedValueOnce({ id: 1 } as never) // Max overlaps
      .mockResolvedValueOnce(null as never)       // Rex does not

    const data = await (await GET(makeReq({ dogId: '1', start: '2026-04-21', end: '2026-04-25' }))).json()
    expect(data).toHaveLength(1)
    expect(data[0].dogName).toBe('Max')
  })

  // ─── Default end date ─────────────────────────────────────────────────────

  it('uses start as end when end param is omitted (single-day range)', async () => {
    vi.mocked(prisma.dogConflict.findMany)
      .mockResolvedValueOnce([] as never[])
      .mockResolvedValueOnce([] as never[])

    // Should not throw
    const data = await (await GET(makeReq({ dogId: '1', start: '2026-04-21' }))).json()
    expect(data).toEqual([])
  })

})
