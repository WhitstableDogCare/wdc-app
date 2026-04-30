import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    dog: { findMany: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { GET } from '../app/api/dashboard/route'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = new Date()
const todayIso = now.toISOString()

// Dates relative to now for deterministic results
const twoYearsAgo = new Date(now.getFullYear() - 2, 0, 1).toISOString().split('T')[0]
const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0]
const lastYearIso = new Date(now.getFullYear() - 2, 0, 1).toISOString()

const makeDog = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: 'Buddy',
  breed: null,
  photo_path: null,
  sex: null,
  neutered: null,
  energy_level: null,
  vaccination_date: null,
  created_at: todayIso,
  vets: [],
  owners: [],
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Dog counts ───────────────────────────────────────────────────────────────

describe('GET /api/dashboard — dog counts', () => {

  it('returns correct total', async () => {
    vi.mocked(prisma.dog.findMany).mockResolvedValue([
      makeDog({ id: 1 }), makeDog({ id: 2 }), makeDog({ id: 3 }),
    ] as never[])
    const data = await (await GET()).json()
    expect(data.dogs.total).toBe(3)
  })

  it('counts dogs with and without photos', async () => {
    vi.mocked(prisma.dog.findMany).mockResolvedValue([
      makeDog({ photo_path: '/photos/1.jpg' }),
      makeDog({ photo_path: null }),
      makeDog({ photo_path: '/photos/3.jpg' }),
    ] as never[])
    const data = await (await GET()).json()
    expect(data.dogs.withPhoto).toBe(2)
    expect(data.dogs.withoutPhoto).toBe(1)
  })

  it('counts dogs with and without vets', async () => {
    vi.mocked(prisma.dog.findMany).mockResolvedValue([
      makeDog({ vets: [{ id: 1, name: 'Dr Smith' }] }),
      makeDog({ vets: [] }),
      makeDog({ vets: [] }),
    ] as never[])
    const data = await (await GET()).json()
    expect(data.dogs.withVet).toBe(1)
    expect(data.dogs.noVet).toBe(2)
  })

  it('counts new dogs added this month', async () => {
    vi.mocked(prisma.dog.findMany).mockResolvedValue([
      makeDog({ created_at: todayIso }),     // this month
      makeDog({ created_at: lastYearIso }),  // old
      makeDog({ created_at: todayIso }),     // this month
    ] as never[])
    const data = await (await GET()).json()
    expect(data.dogs.newThisMonth).toBe(2)
  })

  it('counts new dogs added this year', async () => {
    vi.mocked(prisma.dog.findMany).mockResolvedValue([
      makeDog({ created_at: todayIso }),    // this year
      makeDog({ created_at: lastYearIso }), // 2 years ago
    ] as never[])
    const data = await (await GET()).json()
    expect(data.dogs.newThisYear).toBe(1)
  })

  it('returns zero counts for an empty dog list', async () => {
    vi.mocked(prisma.dog.findMany).mockResolvedValue([] as never[])
    const data = await (await GET()).json()
    expect(data.dogs.total).toBe(0)
    expect(data.dogs.withPhoto).toBe(0)
    expect(data.dogs.withVet).toBe(0)
    expect(data.dogs.newThisMonth).toBe(0)
  })

})

// ─── Vaccination tracking ─────────────────────────────────────────────────────

describe('GET /api/dashboard — vaccination tracking', () => {

  it('identifies overdue vaccinations (date older than 1 year)', async () => {
    vi.mocked(prisma.dog.findMany).mockResolvedValue([
      makeDog({ id: 1, name: 'Max', vaccination_date: twoYearsAgo }),   // overdue
      makeDog({ id: 2, name: 'Bella', vaccination_date: sixMonthsAgo }), // current
    ] as never[])
    const data = await (await GET()).json()
    expect(data.dogs.overdueVaccinations).toHaveLength(1)
    expect(data.dogs.overdueVaccinations[0].name).toBe('Max')
    expect(data.dogs.overdueVaccinations[0].vaccination_date).toBe(twoYearsAgo)
  })

  it('identifies dogs with no vaccination date recorded', async () => {
    vi.mocked(prisma.dog.findMany).mockResolvedValue([
      makeDog({ id: 1, name: 'Rex', vaccination_date: null }),
      makeDog({ id: 2, name: 'Daisy', vaccination_date: sixMonthsAgo }),
    ] as never[])
    const data = await (await GET()).json()
    expect(data.dogs.missingVaccinations).toHaveLength(1)
    expect(data.dogs.missingVaccinations[0].name).toBe('Rex')
  })

  it('returns empty arrays when all vaccinations are current', async () => {
    vi.mocked(prisma.dog.findMany).mockResolvedValue([
      makeDog({ vaccination_date: sixMonthsAgo }),
      makeDog({ vaccination_date: sixMonthsAgo }),
    ] as never[])
    const data = await (await GET()).json()
    expect(data.dogs.overdueVaccinations).toHaveLength(0)
    expect(data.dogs.missingVaccinations).toHaveLength(0)
  })

  it('includes dog id and name in overdue list', async () => {
    vi.mocked(prisma.dog.findMany).mockResolvedValue([
      makeDog({ id: 42, name: 'Charlie', vaccination_date: twoYearsAgo }),
    ] as never[])
    const data = await (await GET()).json()
    expect(data.dogs.overdueVaccinations[0]).toMatchObject({ id: 42, name: 'Charlie' })
  })

})

// ─── Breed breakdown ──────────────────────────────────────────────────────────

describe('GET /api/dashboard — breed breakdown', () => {

  it('returns breeds sorted by count descending', async () => {
    vi.mocked(prisma.dog.findMany).mockResolvedValue([
      makeDog({ breed: 'Labrador' }),
      makeDog({ breed: 'Labrador' }),
      makeDog({ breed: 'Labrador' }),
      makeDog({ breed: 'Spaniel' }),
      makeDog({ breed: 'Spaniel' }),
      makeDog({ breed: 'Poodle' }),
    ] as never[])
    const data = await (await GET()).json()
    expect(data.dogs.topBreeds[0]).toEqual(['Labrador', 3])
    expect(data.dogs.topBreeds[1]).toEqual(['Spaniel', 2])
    expect(data.dogs.topBreeds[2]).toEqual(['Poodle', 1])
  })

  it('limits breed breakdown to top 8', async () => {
    const dogs = ['A','B','C','D','E','F','G','H','I','J'].map(breed => makeDog({ breed }))
    vi.mocked(prisma.dog.findMany).mockResolvedValue(dogs as never[])
    const data = await (await GET()).json()
    expect(data.dogs.topBreeds).toHaveLength(8)
  })

  it('excludes dogs with no breed from the breakdown', async () => {
    vi.mocked(prisma.dog.findMany).mockResolvedValue([
      makeDog({ breed: null }),
      makeDog({ breed: 'Labrador' }),
    ] as never[])
    const data = await (await GET()).json()
    expect(data.dogs.topBreeds).toHaveLength(1)
    expect(data.dogs.topBreeds[0]).toEqual(['Labrador', 1])
  })

})

// ─── Sex and neutered breakdowns ──────────────────────────────────────────────

describe('GET /api/dashboard — sex and neutered breakdowns', () => {

  it('counts sex breakdown correctly, using Unknown for null', async () => {
    vi.mocked(prisma.dog.findMany).mockResolvedValue([
      makeDog({ sex: 'Male' }),
      makeDog({ sex: 'Male' }),
      makeDog({ sex: 'Female' }),
      makeDog({ sex: null }),
    ] as never[])
    const data = await (await GET()).json()
    expect(data.dogs.sexBreakdown.Male).toBe(2)
    expect(data.dogs.sexBreakdown.Female).toBe(1)
    expect(data.dogs.sexBreakdown.Unknown).toBe(1)
  })

  it('counts neutered, intact, and unknown correctly', async () => {
    vi.mocked(prisma.dog.findMany).mockResolvedValue([
      makeDog({ neutered: true }),
      makeDog({ neutered: true }),
      makeDog({ neutered: false }),
      makeDog({ neutered: null }),
    ] as never[])
    const data = await (await GET()).json()
    expect(data.dogs.neuteredCount).toBe(2)
    expect(data.dogs.intactCount).toBe(1)
    expect(data.dogs.unknownNeutered).toBe(1)
  })

})

// ─── Response shape ───────────────────────────────────────────────────────────

describe('GET /api/dashboard — response shape', () => {

  it('returns all expected top-level keys', async () => {
    vi.mocked(prisma.dog.findMany).mockResolvedValue([] as never[])
    const data = await (await GET()).json()
    const keys = Object.keys(data.dogs)
    for (const key of ['total','withPhoto','withoutPhoto','withVet','noVet',
      'newThisMonth','newThisYear','sexBreakdown','neuteredCount','intactCount',
      'unknownNeutered','energyBreakdown','topBreeds','overdueVaccinations','missingVaccinations']) {
      expect(keys).toContain(key)
    }
  })

})
