import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── Hoisted mocks (available inside vi.mock factories) ───────────────────────
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
    booking: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    dog: { findUnique: vi.fn() },
    invoice: { create: vi.fn() },
  },
}))

vi.mock('@/lib/google-calendar', () => ({
  createCalendarEvent: vi.fn().mockResolvedValue('event-id-123'),
  createRecurringCalendarEvent: vi.fn().mockResolvedValue('recurring-id-456'),
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
import { createCalendarEvent, createRecurringCalendarEvent } from '@/lib/google-calendar'
import { syncPublicCalendarDays } from '@/lib/public-calendar'
import { readConfig, writeConfig } from '@/lib/config'
import { POST } from '../app/api/bookings/route'
import type { NextRequest } from 'next/server'

// Fake request — avoids edge-runtime issues with real NextRequest
const makeReq = (body: Record<string, unknown>) =>
  ({ json: () => Promise.resolve(body) } as unknown as NextRequest)

// A minimal booking returned by prisma.booking.create
const makeBooking = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  dog_name: 'Buddy',
  owner_name: 'Jane',
  owner_email: 'jane@example.com',
  booking_type: 'Daycare',
  start_date: '2026-04-21',
  end_date: null,
  drop_off_time: '09:00',
  pick_up_time: '17:00',
  notes: null,
  status: 'Confirmed',
  google_event_id: 'event-id-123',
  is_recurring: false,
  day_of_week: null,
  confirmation_sent: false,
  ...overrides,
})

// A minimal invoice returned by prisma.invoice.create
const makeInvoice = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  invoice_number: '0001',
  invoice_date: '2026-04-21',
  due_date: '2026-04-21',
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
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  // Restore defaults after clearAllMocks
  vi.mocked(createCalendarEvent).mockResolvedValue('event-id-123')
  vi.mocked(createRecurringCalendarEvent).mockResolvedValue('recurring-id-456')
  vi.mocked(syncPublicCalendarDays).mockResolvedValue(undefined)
  vi.mocked(readConfig).mockReturnValue({
    businessEmail: 'hello@wdc.com',
    gmailAppPassword: 'app-password',
    businessName: 'Whitstable Dog Care',
    businessPhone: '01227 000000',
    nextInvoiceNumber: 1,
  })
  vi.mocked(writeConfig).mockReturnValue(undefined)
  mockSendMail.mockResolvedValue({})
  mockPdf.mockResolvedValue(Buffer.from('fake-pdf'))
  mockPage.setContent.mockResolvedValue(undefined)
  mockPage.close.mockResolvedValue(undefined)
  mockBrowser.newPage.mockResolvedValue(mockPage)
  mockBrowser.close.mockResolvedValue(undefined)
})

// ─── Capacity check ───────────────────────────────────────────────────────────

describe('POST /api/bookings — capacity check', () => {

  it('returns 409 when 5 bookings already overlap the date range', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce(
      Array(5).fill({ id: 1 }) as never[]
    )
    const res = await POST(makeReq({ dogName: 'Buddy', bookingType: 'Daycare', startDate: '2026-04-21', isRecurring: false, sendEmail: false }))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toMatch(/capacity/i)
  })

  it('allows booking when only 4 bookings overlap (under capacity)', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce(
      Array(4).fill({ id: 1 }) as never[]
    )
    vi.mocked(prisma.booking.create).mockResolvedValueOnce(makeBooking() as never)

    const res = await POST(makeReq({ dogName: 'Buddy', bookingType: 'Daycare', startDate: '2026-04-21', isRecurring: false, sendEmail: false }))
    expect(res.status).toBe(200)
  })

  it('skips capacity check entirely for recurring bookings', async () => {
    vi.mocked(prisma.booking.create).mockResolvedValueOnce(makeBooking({ is_recurring: true, day_of_week: 1 }) as never)

    await POST(makeReq({ dogName: 'Buddy', bookingType: 'Daycare', startDate: '2026-04-21', dayOfWeek: 1, isRecurring: true, sendEmail: false }))

    expect(prisma.booking.findMany).not.toHaveBeenCalled()
  })

})

// ─── Calendar event creation ──────────────────────────────────────────────────

describe('POST /api/bookings — calendar events', () => {

  it('calls createCalendarEvent for non-recurring bookings', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([] as never[])
    vi.mocked(prisma.booking.create).mockResolvedValueOnce(makeBooking() as never)

    await POST(makeReq({ dogName: 'Buddy', bookingType: 'Daycare', startDate: '2026-04-21', isRecurring: false, sendEmail: false }))

    expect(createCalendarEvent).toHaveBeenCalledWith(expect.objectContaining({ title: 'Daycare: Buddy' }))
    expect(createRecurringCalendarEvent).not.toHaveBeenCalled()
  })

  it('calls createRecurringCalendarEvent for recurring bookings', async () => {
    vi.mocked(prisma.booking.create).mockResolvedValueOnce(makeBooking({ is_recurring: true }) as never)

    await POST(makeReq({ dogName: 'Buddy', bookingType: 'Daycare', startDate: '2026-04-21', dayOfWeek: 2, isRecurring: true, sendEmail: false }))

    expect(createRecurringCalendarEvent).toHaveBeenCalledWith(expect.objectContaining({ title: 'Daycare: Buddy', dayOfWeek: 2 }))
    expect(createCalendarEvent).not.toHaveBeenCalled()
  })

})

// ─── Discount logic ───────────────────────────────────────────────────────────

describe('POST /api/bookings — 10% discount logic', () => {

  const setupEmailMocks = () => {
    vi.mocked(prisma.dog.findUnique).mockResolvedValueOnce({
      breed: 'Labrador',
      owners: [{ name: 'Jane', email: 'jane@example.com', phone: null, address: null }],
    } as never)
    vi.mocked(prisma.booking.update).mockResolvedValueOnce(makeBooking() as never)
  }

  it('applies 10% discount (apply_discount: true) for 7-night boarding stay', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([] as never[])
    vi.mocked(prisma.booking.create).mockResolvedValueOnce(makeBooking({ booking_type: 'Boarding', start_date: '2026-04-21', end_date: '2026-04-28' }) as never)
    setupEmailMocks()
    vi.mocked(prisma.invoice.create).mockResolvedValueOnce(makeInvoice({ apply_discount: true }) as never)

    await POST(makeReq({
      dogId: 1, dogName: 'Buddy', ownerEmail: 'jane@example.com',
      bookingType: 'Boarding', startDate: '2026-04-21', endDate: '2026-04-28', // 7 nights
      isRecurring: false,
    }))

    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ apply_discount: true }) })
    )
  })

  it('does NOT apply discount (apply_discount: false) for 6-night boarding stay', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([] as never[])
    vi.mocked(prisma.booking.create).mockResolvedValueOnce(makeBooking({ booking_type: 'Boarding', start_date: '2026-04-21', end_date: '2026-04-27' }) as never)
    setupEmailMocks()
    vi.mocked(prisma.invoice.create).mockResolvedValueOnce(makeInvoice({ apply_discount: false }) as never)

    await POST(makeReq({
      dogId: 1, dogName: 'Buddy', ownerEmail: 'jane@example.com',
      bookingType: 'Boarding', startDate: '2026-04-21', endDate: '2026-04-27', // 6 nights
      isRecurring: false,
    }))

    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ apply_discount: false }) })
    )
  })

  it('does NOT apply discount for daycare regardless of duration', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([] as never[])
    vi.mocked(prisma.booking.create).mockResolvedValueOnce(makeBooking() as never)
    setupEmailMocks()
    vi.mocked(prisma.invoice.create).mockResolvedValueOnce(makeInvoice({ apply_discount: false }) as never)

    await POST(makeReq({
      dogId: 1, dogName: 'Buddy', ownerEmail: 'jane@example.com',
      bookingType: 'Daycare', startDate: '2026-04-21',
      isRecurring: false,
    }))

    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ apply_discount: false }) })
    )
  })

})

// ─── Email skipping ───────────────────────────────────────────────────────────

describe('POST /api/bookings — email skipping', () => {

  it('skips email and invoice when gmail is not configured', async () => {
    vi.mocked(readConfig).mockReturnValue({ nextInvoiceNumber: 1 }) // no email config
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([] as never[])
    vi.mocked(prisma.booking.create).mockResolvedValueOnce(makeBooking() as never)

    const res = await POST(makeReq({
      dogName: 'Buddy', ownerEmail: 'jane@example.com',
      bookingType: 'Daycare', startDate: '2026-04-21', isRecurring: false,
    }))

    expect(prisma.invoice.create).not.toHaveBeenCalled()
    expect(mockSendMail).not.toHaveBeenCalled()
    const data = await res.json()
    expect(data.confirmation_sent).toBe(false)
  })

  it('skips email and invoice when no owner email is available', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([] as never[])
    vi.mocked(prisma.booking.create).mockResolvedValueOnce(makeBooking({ owner_email: null }) as never)
    vi.mocked(prisma.dog.findUnique).mockResolvedValueOnce({
      breed: null,
      owners: [{ name: 'Unknown', email: null, phone: null, address: null }],
    } as never)

    const res = await POST(makeReq({
      dogId: 1, dogName: 'Buddy',
      bookingType: 'Daycare', startDate: '2026-04-21', isRecurring: false,
    }))

    expect(prisma.invoice.create).not.toHaveBeenCalled()
    expect(mockSendMail).not.toHaveBeenCalled()
    const data = await res.json()
    expect(data.confirmation_sent).toBe(false)
  })

})

// ─── confirmation_sent flag ───────────────────────────────────────────────────

describe('POST /api/bookings — confirmation_sent flag', () => {

  it('sets confirmation_sent: true in DB when email is sent successfully', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([] as never[])
    vi.mocked(prisma.booking.create).mockResolvedValueOnce(makeBooking() as never)
    vi.mocked(prisma.dog.findUnique).mockResolvedValueOnce({
      breed: null,
      owners: [{ name: 'Jane', email: 'jane@example.com', phone: null, address: null }],
    } as never)
    vi.mocked(prisma.invoice.create).mockResolvedValueOnce(makeInvoice() as never)
    vi.mocked(prisma.booking.update).mockResolvedValueOnce(makeBooking() as never)

    await POST(makeReq({
      dogId: 1, dogName: 'Buddy', ownerEmail: 'jane@example.com',
      bookingType: 'Daycare', startDate: '2026-04-21', isRecurring: false,
    }))

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { confirmation_sent: true } })
    )
  })

})

// ─── Public calendar sync ─────────────────────────────────────────────────────

describe('POST /api/bookings — public calendar sync', () => {

  it('triggers public calendar sync for non-recurring bookings', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([] as never[])
    vi.mocked(prisma.booking.create).mockResolvedValueOnce(makeBooking() as never)

    await POST(makeReq({ dogName: 'Buddy', bookingType: 'Daycare', startDate: '2026-04-21', isRecurring: false, sendEmail: false }))

    // Give the non-blocking .catch() a tick to fire
    await new Promise(r => setTimeout(r, 0))
    expect(syncPublicCalendarDays).toHaveBeenCalledWith('2026-04-21', '2026-04-21')
  })

  it('does NOT trigger public calendar sync for recurring bookings', async () => {
    vi.mocked(prisma.booking.create).mockResolvedValueOnce(makeBooking({ is_recurring: true }) as never)

    await POST(makeReq({ dogName: 'Buddy', bookingType: 'Daycare', startDate: '2026-04-21', dayOfWeek: 1, isRecurring: true, sendEmail: false }))

    await new Promise(r => setTimeout(r, 0))
    expect(syncPublicCalendarDays).not.toHaveBeenCalled()
  })

})

// ─── Invoice counter ──────────────────────────────────────────────────────────

describe('POST /api/bookings — invoice counter', () => {

  it('increments the invoice counter after creating an invoice', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([] as never[])
    vi.mocked(prisma.booking.create).mockResolvedValueOnce(makeBooking() as never)
    vi.mocked(prisma.dog.findUnique).mockResolvedValueOnce({
      breed: null,
      owners: [{ name: 'Jane', email: 'jane@example.com', phone: null, address: null }],
    } as never)
    vi.mocked(prisma.invoice.create).mockResolvedValueOnce(makeInvoice() as never)
    vi.mocked(prisma.booking.update).mockResolvedValueOnce(makeBooking() as never)

    await POST(makeReq({
      dogId: 1, dogName: 'Buddy', ownerEmail: 'jane@example.com',
      bookingType: 'Daycare', startDate: '2026-04-21', isRecurring: false,
    }))

    expect(writeConfig).toHaveBeenCalledWith(
      expect.objectContaining({ nextInvoiceNumber: 2 })
    )
  })

})
