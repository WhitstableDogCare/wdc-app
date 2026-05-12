import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockSendMail, mockPdf, mockPage, mockBrowser } = vi.hoisted(() => {
  const mockSendMail = vi.fn().mockResolvedValue({})
  const mockPdf = vi.fn().mockResolvedValue(Buffer.from('fake-pdf'))
  const mockPage = {
    setContent: vi.fn().mockResolvedValue(undefined),
    pdf: mockPdf,
    close: vi.fn().mockResolvedValue(undefined),
  }
  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
  }
  return { mockSendMail, mockPdf, mockPage, mockBrowser }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    booking: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    dog: { findUnique: vi.fn() },
    invoice: { create: vi.fn() },
  },
}))

vi.mock('@/lib/google-calendar', () => ({
  createCalendarEvent: vi.fn().mockResolvedValue('event-id-123'),
}))

vi.mock('@/lib/config', () => ({
  readConfig: vi.fn().mockReturnValue({
    businessEmail: 'hello@wdc.com',
    gmailAppPassword: 'app-password',
    businessName: 'Whitstable Dog Care',
    businessPhone: '01227 000000',
    nextInvoiceNumber: 1,
  }),
  writeConfig: vi.fn(),
}))

vi.mock('@/lib/public-calendar', () => ({
  syncPublicCalendarDays: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}))

vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
}))

import { prisma } from '@/lib/prisma'
import { createCalendarEvent } from '@/lib/google-calendar'
import { syncPublicCalendarDays } from '@/lib/public-calendar'
import { readConfig, writeConfig } from '@/lib/config'
import { POST } from '../app/api/bookings/group/route'
import { buildGroupServiceLines } from '../lib/invoice-utils'
import type { NextRequest } from 'next/server'

const makeReq = (body: Record<string, unknown>) =>
  ({ json: () => Promise.resolve(body) } as unknown as NextRequest)

let uid = 0
const fakeUid = () => `id-${++uid}`

const makeBooking = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  dog_name: 'Buddy',
  owner_name: 'Jane',
  owner_email: 'jane@example.com',
  booking_type: 'Daycare',
  start_date: '2026-06-08',
  end_date: null,
  drop_off_time: '09:00',
  pick_up_time: '17:00',
  notes: null,
  status: 'Confirmed',
  google_event_id: 'event-id-123',
  confirmation_sent: false,
  booking_group_id: 'group-uuid',
  ...overrides,
})

const makeInvoice = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  invoice_number: '0001',
  invoice_date: '2026-06-08',
  due_date: '2026-06-08',
  client_name: 'Jane',
  client_email: 'jane@example.com',
  client_phone: null,
  client_address: null,
  dog_name: 'Buddy',
  dog_breed: null,
  services: '[]',
  notes: null,
  apply_discount: false,
  total: 0,
  status: 'Unpaid',
  booking_id: null,
  booking_group_id: 'group-uuid',
  ...overrides,
})

// Two standard weekday daycare days (term time, standard rate)
const TWO_DAYS = [
  { date: '2026-06-08', dropOffTime: '09:00', pickUpTime: '17:00' }, // Monday
  { date: '2026-06-09', dropOffTime: '09:00', pickUpTime: '17:00' }, // Tuesday
]

beforeEach(() => {
  uid = 0
  vi.clearAllMocks()
  vi.mocked(createCalendarEvent).mockResolvedValue('event-id-123')
  vi.mocked(syncPublicCalendarDays).mockResolvedValue(undefined)
  vi.mocked(readConfig).mockReturnValue({
    businessEmail: 'hello@wdc.com',
    gmailAppPassword: 'app-password',
    businessName: 'Whitstable Dog Care',
    businessPhone: '01227 000000',
    nextInvoiceNumber: 1,
  })
  vi.mocked(writeConfig).mockReturnValue(undefined)
  vi.mocked(prisma.booking.updateMany).mockResolvedValue({ count: 2 } as never)
  mockSendMail.mockResolvedValue({})
  mockPdf.mockResolvedValue(Buffer.from('fake-pdf'))
  mockPage.setContent.mockResolvedValue(undefined)
  mockPage.close.mockResolvedValue(undefined)
  mockBrowser.newPage.mockResolvedValue(mockPage)
  mockBrowser.close.mockResolvedValue(undefined)
})

// ─── buildGroupServiceLines unit tests ───────────────────────────────────────

describe('buildGroupServiceLines', () => {

  it('returns empty array for no days', () => {
    expect(buildGroupServiceLines([], fakeUid)).toEqual([])
  })

  it('groups consecutive same-preset standard days into one line', () => {
    // Mon–Fri term-time, 09:00–17:00 = Full Day Care Standard
    const days = [
      { date: '2026-06-08', dropOffTime: '09:00', pickUpTime: '17:00' },
      { date: '2026-06-09', dropOffTime: '09:00', pickUpTime: '17:00' },
      { date: '2026-06-10', dropOffTime: '09:00', pickUpTime: '17:00' },
    ]
    const lines = buildGroupServiceLines(days, fakeUid)
    expect(lines).toHaveLength(1)
    expect(lines[0].quantity).toBe(3)
    expect(lines[0].description).toMatch(/Full Day Care/)
    expect(lines[0].description).toMatch(/Standard Rate/)
  })

  it('splits into two lines when pick-up time changes preset', () => {
    // First two days: Full Day Care (≤8h), last day: Long Day Care (>8h, 09:00–21:00 = 12h)
    const days = [
      { date: '2026-06-08', dropOffTime: '09:00', pickUpTime: '17:00' },
      { date: '2026-06-09', dropOffTime: '09:00', pickUpTime: '17:00' },
      { date: '2026-06-10', dropOffTime: '09:00', pickUpTime: '21:00' },
    ]
    const lines = buildGroupServiceLines(days, fakeUid)
    expect(lines).toHaveLength(2)
    expect(lines[0].quantity).toBe(2)
    expect(lines[0].description).toMatch(/Full Day Care/)
    expect(lines[1].quantity).toBe(1)
    expect(lines[1].description).toMatch(/Long Day Care/)
  })

  it('splits standard and peak days into separate lines', () => {
    // 2026-06-13 is a Saturday (peak), 2026-06-15 is a Monday (standard term time)
    const days = [
      { date: '2026-06-13', dropOffTime: '09:00', pickUpTime: '17:00' }, // Sat — peak
      { date: '2026-06-15', dropOffTime: '09:00', pickUpTime: '17:00' }, // Mon — standard
    ]
    const lines = buildGroupServiceLines(days, fakeUid)
    expect(lines).toHaveLength(2)
    expect(lines[0].description).toMatch(/Peak Rate/)
    expect(lines[1].description).toMatch(/Standard Rate/)
  })

  it('uses peak rate for weekend days', () => {
    const days = [{ date: '2026-06-13', dropOffTime: '09:00', pickUpTime: '17:00' }] // Saturday
    const lines = buildGroupServiceLines(days, fakeUid)
    expect(lines[0].rate).toBe(40) // Full Day Care peak rate
  })

  it('uses standard rate for weekday term-time days', () => {
    const days = [{ date: '2026-06-08', dropOffTime: '09:00', pickUpTime: '17:00' }] // Monday term time
    const lines = buildGroupServiceLines(days, fakeUid)
    expect(lines[0].rate).toBe(30) // Full Day Care standard rate
  })

})

// ─── Validation ───────────────────────────────────────────────────────────────

describe('POST /api/bookings/group — validation', () => {

  it('returns 400 when fewer than 2 days are provided', async () => {
    const res = await POST(makeReq({ dogName: 'Buddy', days: [TWO_DAYS[0]] }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/at least 2/i)
  })

  it('returns 400 when days is empty', async () => {
    const res = await POST(makeReq({ dogName: 'Buddy', days: [] }))
    expect(res.status).toBe(400)
  })

})

// ─── Capacity check ───────────────────────────────────────────────────────────

describe('POST /api/bookings/group — capacity check', () => {

  it('returns 409 when the first day is at capacity', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce(Array(5).fill({ id: 99 }) as never[])
    const res = await POST(makeReq({ dogName: 'Buddy', days: TWO_DAYS, sendEmail: false }))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toMatch(/capacity/i)
  })

  it('returns 409 when a later day in the group is at capacity', async () => {
    // First day clear, second day full
    vi.mocked(prisma.booking.findMany)
      .mockResolvedValueOnce([] as never[])
      .mockResolvedValueOnce(Array(5).fill({ id: 99 }) as never[])
    const res = await POST(makeReq({ dogName: 'Buddy', days: TWO_DAYS, sendEmail: false }))
    expect(res.status).toBe(409)
  })

  it('proceeds when all days are under capacity', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValue([] as never[])
    vi.mocked(prisma.booking.create)
      .mockResolvedValueOnce(makeBooking({ id: 1, start_date: '2026-06-08' }) as never)
      .mockResolvedValueOnce(makeBooking({ id: 2, start_date: '2026-06-09' }) as never)
    const res = await POST(makeReq({ dogName: 'Buddy', days: TWO_DAYS, sendEmail: false }))
    expect(res.status).toBe(200)
  })

})

// ─── Booking creation ─────────────────────────────────────────────────────────

describe('POST /api/bookings/group — booking creation', () => {

  beforeEach(() => {
    vi.mocked(prisma.booking.findMany).mockResolvedValue([] as never[])
    vi.mocked(prisma.booking.create)
      .mockResolvedValueOnce(makeBooking({ id: 1, start_date: '2026-06-08' }) as never)
      .mockResolvedValueOnce(makeBooking({ id: 2, start_date: '2026-06-09' }) as never)
  })

  it('creates one booking per day', async () => {
    await POST(makeReq({ dogName: 'Buddy', days: TWO_DAYS, sendEmail: false }))
    expect(prisma.booking.create).toHaveBeenCalledTimes(2)
  })

  it('creates one calendar event per day', async () => {
    await POST(makeReq({ dogName: 'Buddy', days: TWO_DAYS, sendEmail: false }))
    expect(createCalendarEvent).toHaveBeenCalledTimes(2)
  })

  it('all bookings share the same booking_group_id', async () => {
    await POST(makeReq({ dogName: 'Buddy', days: TWO_DAYS, sendEmail: false }))
    const calls = vi.mocked(prisma.booking.create).mock.calls
    const groupId0 = (calls[0][0] as any).data.booking_group_id
    const groupId1 = (calls[1][0] as any).data.booking_group_id
    expect(groupId0).toBeTruthy()
    expect(groupId0).toBe(groupId1)
  })

  it('uses the correct date and times for each booking', async () => {
    await POST(makeReq({ dogName: 'Buddy', days: TWO_DAYS, sendEmail: false }))
    const calls = vi.mocked(prisma.booking.create).mock.calls
    expect((calls[0][0] as any).data.start_date).toBe('2026-06-08')
    expect((calls[0][0] as any).data.drop_off_time).toBe('09:00')
    expect((calls[1][0] as any).data.start_date).toBe('2026-06-09')
  })

  it('returns groupId and bookingIds in the response', async () => {
    const res = await POST(makeReq({ dogName: 'Buddy', days: TWO_DAYS, sendEmail: false }))
    const data = await res.json()
    expect(data.groupId).toBeTruthy()
    expect(Array.isArray(data.bookingIds)).toBe(true)
    expect(data.bookingIds).toHaveLength(2)
  })

  it('triggers public calendar sync', async () => {
    await POST(makeReq({ dogName: 'Buddy', days: TWO_DAYS, sendEmail: false }))
    await new Promise(r => setTimeout(r, 0))
    expect(syncPublicCalendarDays).toHaveBeenCalledWith('2026-06-08', '2026-06-09')
  })

})

// ─── Invoice and email ────────────────────────────────────────────────────────

describe('POST /api/bookings/group — invoice', () => {

  beforeEach(() => {
    vi.mocked(prisma.booking.findMany).mockResolvedValue([] as never[])
    vi.mocked(prisma.booking.create)
      .mockResolvedValueOnce(makeBooking({ id: 1 }) as never)
      .mockResolvedValueOnce(makeBooking({ id: 2 }) as never)
  })

  it('skips invoice and email when gmail is not configured', async () => {
    vi.mocked(readConfig).mockReturnValue({ nextInvoiceNumber: 1 })
    const res = await POST(makeReq({ dogName: 'Buddy', ownerEmail: 'jane@example.com', days: TWO_DAYS }))
    expect(prisma.invoice.create).not.toHaveBeenCalled()
    expect(mockSendMail).not.toHaveBeenCalled()
    const data = await res.json()
    expect(data.confirmation_sent).toBe(false)
  })

  it('skips invoice and email when no owner email is available', async () => {
    vi.mocked(prisma.dog.findUnique).mockResolvedValueOnce({
      breed: null,
      owners: [{ name: 'Unknown', email: null, phone: null, address: null }],
    } as never)
    const res = await POST(makeReq({ dogId: 1, dogName: 'Buddy', days: TWO_DAYS }))
    expect(prisma.invoice.create).not.toHaveBeenCalled()
    expect(mockSendMail).not.toHaveBeenCalled()
    const data = await res.json()
    expect(data.confirmation_sent).toBe(false)
  })

  it('creates invoice linked via booking_group_id (not booking_id)', async () => {
    vi.mocked(prisma.dog.findUnique).mockResolvedValueOnce({
      breed: null,
      owners: [{ name: 'Jane', email: 'jane@example.com', phone: null, address: null }],
    } as never)
    vi.mocked(prisma.invoice.create).mockResolvedValueOnce(makeInvoice() as never)

    await POST(makeReq({ dogId: 1, dogName: 'Buddy', ownerEmail: 'jane@example.com', days: TWO_DAYS }))

    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          booking_id: null,
          booking_group_id: expect.any(String),
        }),
      })
    )
  })

  it('increments invoice counter after creating invoice', async () => {
    vi.mocked(prisma.dog.findUnique).mockResolvedValueOnce({
      breed: null,
      owners: [{ name: 'Jane', email: 'jane@example.com', phone: null, address: null }],
    } as never)
    vi.mocked(prisma.invoice.create).mockResolvedValueOnce(makeInvoice() as never)

    await POST(makeReq({ dogId: 1, dogName: 'Buddy', ownerEmail: 'jane@example.com', days: TWO_DAYS }))

    expect(writeConfig).toHaveBeenCalledWith(expect.objectContaining({ nextInvoiceNumber: 2 }))
  })

  it('marks all bookings confirmation_sent after email is sent', async () => {
    vi.mocked(prisma.dog.findUnique).mockResolvedValueOnce({
      breed: null,
      owners: [{ name: 'Jane', email: 'jane@example.com', phone: null, address: null }],
    } as never)
    vi.mocked(prisma.invoice.create).mockResolvedValueOnce(makeInvoice() as never)

    await POST(makeReq({ dogId: 1, dogName: 'Buddy', ownerEmail: 'jane@example.com', days: TWO_DAYS }))

    expect(prisma.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { confirmation_sent: true } })
    )
  })

})
