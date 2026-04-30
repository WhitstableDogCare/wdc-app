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
    booking: { findMany: vi.fn(), update: vi.fn() },
    invoice: { create: vi.fn() },
  },
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
import { readConfig, writeConfig } from '@/lib/config'
import { GET, POST } from '../app/api/invoices/bulk/route'
import type { NextRequest } from 'next/server'

const makePostReq = (body: Record<string, unknown>) =>
  ({ json: () => Promise.resolve(body) } as unknown as Request)

// ─── Booking fixture helpers ───────────────────────────────────────────────────

const makeBooking = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  dog_name: 'Buddy',
  dog_id: 1,
  owner_name: 'Jane Smith',
  owner_email: 'jane@example.com',
  booking_type: 'Daycare',
  start_date: '2026-04-21',
  end_date: null,
  drop_off_time: '09:00',
  pick_up_time: '17:00',
  notes: null,
  dog: {
    id: 1, name: 'Buddy', breed: 'Labrador',
    owners: [{ name: 'Jane Smith', email: 'jane@example.com', phone: '07000', address: '1 Street' }],
  },
  ...overrides,
})

const makeInvoice = (overrides: Record<string, unknown> = {}) => ({
  id: 1, invoice_number: '0001', invoice_date: '2026-04-21', due_date: '2026-04-21',
  client_name: 'Jane', client_email: 'jane@example.com', client_phone: null, client_address: null,
  dog_name: 'Buddy', dog_breed: null, services: '[]', notes: null,
  apply_discount: false, total: 0, status: 'Unpaid',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
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

// ─── GET /api/invoices/bulk ────────────────────────────────────────────────────

describe('GET /api/invoices/bulk', () => {

  it('returns bookings without invoices with key fields', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([makeBooking()] as never[])
    const data = await (await GET()).json()
    expect(data).toHaveLength(1)
    expect(data[0].dog_name).toBe('Buddy')
    expect(data[0].start_date).toBe('2026-04-21')
  })

  it('sets has_email: true when booking has an email address', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([
      makeBooking({ owner_email: 'jane@example.com' }),
    ] as never[])
    const data = await (await GET()).json()
    expect(data[0].has_email).toBe(true)
  })

  it('sets has_email: false when neither booking nor dog owner has an email', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([
      makeBooking({
        owner_email: null,
        dog: { id: 1, name: 'Buddy', breed: null, owners: [{ name: 'Jane', email: null, phone: null, address: null }] },
      }),
    ] as never[])
    const data = await (await GET()).json()
    expect(data[0].has_email).toBe(false)
  })

  it('falls back to dog owner email when booking owner_email is null', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([
      makeBooking({
        owner_email: null,
        dog: { id: 1, name: 'Buddy', breed: null, owners: [{ name: 'Dave', email: 'dave@example.com', phone: null, address: null }] },
      }),
    ] as never[])
    const data = await (await GET()).json()
    expect(data[0].owner_email).toBe('dave@example.com')
    expect(data[0].has_email).toBe(true)
  })

  it('falls back to dog owner name when booking owner_name is null', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([
      makeBooking({
        owner_name: null,
        dog: { id: 1, name: 'Buddy', breed: null, owners: [{ name: 'Dave Jones', email: 'dave@example.com', phone: null, address: null }] },
      }),
    ] as never[])
    const data = await (await GET()).json()
    expect(data[0].owner_name).toBe('Dave Jones')
  })

  it('returns empty array when all upcoming bookings already have invoices', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([] as never[])
    const data = await (await GET()).json()
    expect(data).toEqual([])
  })

})

// ─── POST /api/invoices/bulk — validation ─────────────────────────────────────

describe('POST /api/invoices/bulk — validation', () => {

  it('returns 400 when no bookingIds provided', async () => {
    const res = await POST(makePostReq({ bookingIds: [] }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/no bookings/i)
  })

  it('returns 400 when bookingIds is missing entirely', async () => {
    const res = await POST(makePostReq({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 when email is not configured in settings', async () => {
    vi.mocked(readConfig).mockReturnValue({ nextInvoiceNumber: 1 }) // no email config
    const res = await POST(makePostReq({ bookingIds: [1] }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/email not configured/i)
  })

})

// ─── POST /api/invoices/bulk — happy path ─────────────────────────────────────

describe('POST /api/invoices/bulk — invoice sending', () => {

  it('sends invoice and marks booking as confirmation_sent', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([makeBooking()] as never[])
    vi.mocked(prisma.invoice.create).mockResolvedValueOnce(makeInvoice() as never)
    vi.mocked(prisma.booking.update).mockResolvedValueOnce(makeBooking() as never)

    const res = await POST(makePostReq({ bookingIds: [1] }))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.results[0].status).toBe('sent')
    expect(data.results[0].dogName).toBe('Buddy')

    expect(mockSendMail).toHaveBeenCalledTimes(1)
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { confirmation_sent: true } })
    )
  })

  it('skips bookings with no email address and marks them as skipped', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([
      makeBooking({
        owner_email: null,
        dog: { id: 1, name: 'Buddy', breed: null, owners: [{ name: 'Jane', email: null, phone: null, address: null }] },
      }),
    ] as never[])

    const res = await POST(makePostReq({ bookingIds: [1] }))
    const data = await res.json()

    expect(data.results[0].status).toBe('skipped')
    expect(data.results[0].reason).toMatch(/no email/i)
    expect(mockSendMail).not.toHaveBeenCalled()
    expect(prisma.invoice.create).not.toHaveBeenCalled()
  })

  it('processes multiple bookings and sends each invoice', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([
      makeBooking({ id: 1, dog_name: 'Buddy' }),
      makeBooking({ id: 2, dog_name: 'Max' }),
    ] as never[])
    vi.mocked(prisma.invoice.create)
      .mockResolvedValueOnce(makeInvoice({ id: 1 }) as never)
      .mockResolvedValueOnce(makeInvoice({ id: 2 }) as never)
    vi.mocked(prisma.booking.update)
      .mockResolvedValueOnce(makeBooking({ id: 1 }) as never)
      .mockResolvedValueOnce(makeBooking({ id: 2 }) as never)

    const res = await POST(makePostReq({ bookingIds: [1, 2] }))
    const data = await res.json()

    expect(data.results).toHaveLength(2)
    expect(data.results.every((r: { status: string }) => r.status === 'sent')).toBe(true)
    expect(mockSendMail).toHaveBeenCalledTimes(2)
  })

})

// ─── POST /api/invoices/bulk — discount logic ─────────────────────────────────

describe('POST /api/invoices/bulk — discount logic', () => {

  it('applies 10% discount for 7-night boarding stays', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([
      makeBooking({ booking_type: 'Boarding', start_date: '2026-04-21', end_date: '2026-04-28' }), // 7 nights
    ] as never[])
    vi.mocked(prisma.invoice.create).mockResolvedValueOnce(makeInvoice() as never)
    vi.mocked(prisma.booking.update).mockResolvedValueOnce(makeBooking() as never)

    await POST(makePostReq({ bookingIds: [1] }))

    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ apply_discount: true }) })
    )
  })

  it('does NOT apply discount for a 6-night boarding stay', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([
      makeBooking({ booking_type: 'Boarding', start_date: '2026-04-21', end_date: '2026-04-27' }), // 6 nights
    ] as never[])
    vi.mocked(prisma.invoice.create).mockResolvedValueOnce(makeInvoice() as never)
    vi.mocked(prisma.booking.update).mockResolvedValueOnce(makeBooking() as never)

    await POST(makePostReq({ bookingIds: [1] }))

    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ apply_discount: false }) })
    )
  })

})

// ─── POST /api/invoices/bulk — invoice counter ────────────────────────────────

describe('POST /api/invoices/bulk — invoice counter', () => {

  it('increments the counter for each invoice sent', async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([
      makeBooking({ id: 1 }),
      makeBooking({ id: 2 }),
    ] as never[])
    vi.mocked(prisma.invoice.create)
      .mockResolvedValueOnce(makeInvoice() as never)
      .mockResolvedValueOnce(makeInvoice() as never)
    vi.mocked(prisma.booking.update)
      .mockResolvedValueOnce(makeBooking() as never)
      .mockResolvedValueOnce(makeBooking() as never)

    await POST(makePostReq({ bookingIds: [1, 2] }))

    // writeConfig should be called twice, each with an incremented value
    expect(writeConfig).toHaveBeenCalledTimes(2)
    const calls = vi.mocked(writeConfig).mock.calls
    expect(calls[0][0]).toMatchObject({ nextInvoiceNumber: 2 })
    expect(calls[1][0]).toMatchObject({ nextInvoiceNumber: 2 }) // both read 1 → write 2 (same mock return)
  })

})
