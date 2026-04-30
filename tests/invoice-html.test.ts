import { describe, it, expect } from 'vitest'
import { generateInvoiceHtml } from '../lib/invoice-html'

// Minimal valid types matching lib/invoice-html.ts internals
interface ServiceLine {
  id: string
  type: 'boarding' | 'daycare'
  description: string
  startDate: string
  endDate: string
  quantity: number
  rate: number
}

const makeServices = (lines: ServiceLine[]) => JSON.stringify(lines)

const boarding2Nights: ServiceLine = {
  id: '1',
  type: 'boarding',
  description: 'Overnight Care (Standard Rate)',
  startDate: '2026-04-22',
  endDate: '2026-04-24', // 2 nights → £100 at £50/night
  quantity: 1,
  rate: 50,
}

const daycare3Days: ServiceLine = {
  id: '2',
  type: 'daycare',
  description: 'Full Day Care (Standard Rate)',
  startDate: '2026-04-21',
  endDate: '',
  quantity: 3, // 3 days → £90 at £30/day
  rate: 30,
}

const baseInvoice = {
  invoice_number: '0042',
  invoice_date: '2026-04-21',
  due_date: '2026-04-28',
  client_name: 'Jane Smith',
  client_email: 'jane@example.com',
  client_phone: '07700 900123',
  client_address: '12 Harbour Street\nWhitstable',
  dog_name: 'Buddy',
  dog_breed: 'Labrador',
  services: makeServices([boarding2Nights]),
  notes: null,
  apply_discount: false,
  total: 100,
}

const baseConfig = {
  businessName: 'Whitstable Dog Care',
  businessAddress: '1 Beach Road\nWhitstable CT5 1AA',
  businessEmail: 'hello@whitstabledogcare.co.uk',
  businessPhone: '01227 000000',
  paymentInfo: 'Sort code: 12-34-56\nAccount: 12345678',
}

// ─── Structure and content ────────────────────────────────────────────────────

describe('generateInvoiceHtml — structure', () => {

  it('returns a complete HTML document', () => {
    const html = generateInvoiceHtml(baseInvoice, baseConfig)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html>')
    expect(html).toContain('</html>')
    expect(html).toContain('<body>')
    expect(html).toContain('</body>')
  })

  it('includes the invoice number', () => {
    const html = generateInvoiceHtml(baseInvoice, baseConfig)
    expect(html).toContain('#0042')
  })

  it('includes the client name', () => {
    const html = generateInvoiceHtml(baseInvoice, baseConfig)
    expect(html).toContain('Jane Smith')
  })

  it('includes the client email', () => {
    const html = generateInvoiceHtml(baseInvoice, baseConfig)
    expect(html).toContain('jane@example.com')
  })

  it('includes the dog name', () => {
    const html = generateInvoiceHtml(baseInvoice, baseConfig)
    expect(html).toContain('Buddy')
  })

  it('includes the dog breed', () => {
    const html = generateInvoiceHtml(baseInvoice, baseConfig)
    expect(html).toContain('Labrador')
  })

  it('includes the business name from config', () => {
    const html = generateInvoiceHtml(baseInvoice, baseConfig)
    expect(html).toContain('Whitstable Dog Care')
  })

  it('includes payment info from config', () => {
    const html = generateInvoiceHtml(baseInvoice, baseConfig)
    expect(html).toContain('Sort code: 12-34-56')
  })

  it('renders the service description', () => {
    const html = generateInvoiceHtml(baseInvoice, baseConfig)
    expect(html).toContain('Overnight Care (Standard Rate)')
  })

  it('renders the service rate', () => {
    const html = generateInvoiceHtml(baseInvoice, baseConfig)
    expect(html).toContain('£50.00')
  })

})

// ─── Total calculation ────────────────────────────────────────────────────────

describe('generateInvoiceHtml — total calculation', () => {

  it('calculates total from service lines (2 boarding nights × £50 = £100)', () => {
    const html = generateInvoiceHtml(baseInvoice, baseConfig)
    // Total should appear in the tfoot
    expect(html).toContain('£100.00')
  })

  it('calculates total for daycare using quantity', () => {
    const invoice = { ...baseInvoice, services: makeServices([daycare3Days]) }
    const html = generateInvoiceHtml(invoice, baseConfig)
    expect(html).toContain('£90.00') // 3 × £30
  })

  it('calculates combined total for multiple service lines', () => {
    const invoice = { ...baseInvoice, services: makeServices([boarding2Nights, daycare3Days]) }
    const html = generateInvoiceHtml(invoice, baseConfig)
    expect(html).toContain('£190.00') // £100 + £90
  })

})

// ─── Discount logic ───────────────────────────────────────────────────────────

describe('generateInvoiceHtml — discount', () => {

  it('shows no discount section when apply_discount is false', () => {
    const html = generateInvoiceHtml({ ...baseInvoice, apply_discount: false }, baseConfig)
    expect(html).not.toContain('Loyalty discount')
    expect(html).not.toContain('Subtotal')
  })

  it('shows discount section when apply_discount is true', () => {
    const html = generateInvoiceHtml({ ...baseInvoice, apply_discount: true }, baseConfig)
    expect(html).toContain('Loyalty discount (10%)')
    expect(html).toContain('Subtotal')
  })

  it('applies 10% discount to the total (£100 × 0.9 = £90)', () => {
    const html = generateInvoiceHtml({ ...baseInvoice, apply_discount: true }, baseConfig)
    expect(html).toContain('£90.00') // discounted total
    expect(html).toContain('−£10.00') // discount amount
  })

  it('shows correct subtotal before discount', () => {
    const html = generateInvoiceHtml({ ...baseInvoice, apply_discount: true }, baseConfig)
    expect(html).toContain('£100.00') // subtotal
  })

  it('shows discounted total in payment section', () => {
    const html = generateInvoiceHtml({ ...baseInvoice, apply_discount: true }, baseConfig)
    // The cash payment line uses the computed total
    expect(html).toContain('£90.00 in cash')
  })

  it('shows full total in payment section when no discount', () => {
    const html = generateInvoiceHtml({ ...baseInvoice, apply_discount: false }, baseConfig)
    expect(html).toContain('£100.00 in cash')
  })

})

// ─── HTML escaping ────────────────────────────────────────────────────────────

describe('generateInvoiceHtml — HTML escaping', () => {

  it('escapes < and > in client name', () => {
    const invoice = { ...baseInvoice, client_name: '<script>alert("xss")</script>' }
    const html = generateInvoiceHtml(invoice, baseConfig)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes & in client name', () => {
    const invoice = { ...baseInvoice, client_name: 'Smith & Jones' }
    const html = generateInvoiceHtml(invoice, baseConfig)
    expect(html).toContain('Smith &amp; Jones')
    expect(html).not.toContain('Smith & Jones')
  })

  it('escapes " in dog name', () => {
    const invoice = { ...baseInvoice, dog_name: 'Buddy "The Good Boy"' }
    const html = generateInvoiceHtml(invoice, baseConfig)
    expect(html).toContain('&quot;The Good Boy&quot;')
  })

  it('converts newlines to <br> in notes', () => {
    const invoice = { ...baseInvoice, notes: 'Line one\nLine two' }
    const html = generateInvoiceHtml(invoice, baseConfig)
    expect(html).toContain('Line one<br>Line two')
  })

  it('converts newlines to <br> in client address', () => {
    // baseInvoice already has a multi-line address
    const html = generateInvoiceHtml(baseInvoice, baseConfig)
    expect(html).toContain('12 Harbour Street<br>Whitstable')
  })

})

// ─── Optional / null fields ───────────────────────────────────────────────────

describe('generateInvoiceHtml — optional fields', () => {

  it('renders without crashing when all optional fields are null', () => {
    const minimal = {
      invoice_number: '0001',
      invoice_date: null,
      due_date: null,
      client_name: null,
      client_email: null,
      client_phone: null,
      client_address: null,
      dog_name: null,
      dog_breed: null,
      services: '[]',
      notes: null,
      apply_discount: false,
      total: 0,
    }
    expect(() => generateInvoiceHtml(minimal, {})).not.toThrow()
  })

  it('omits the services table when services array is empty', () => {
    const invoice = { ...baseInvoice, services: '[]' }
    const html = generateInvoiceHtml(invoice, baseConfig)
    expect(html).not.toContain('<table')
  })

  it('omits the services table when services JSON is invalid', () => {
    const invoice = { ...baseInvoice, services: 'not valid json {{{' }
    const html = generateInvoiceHtml(invoice, baseConfig)
    expect(html).not.toContain('<table')
  })

  it('produces zero total when services is invalid JSON', () => {
    const invoice = { ...baseInvoice, services: 'broken' }
    const html = generateInvoiceHtml(invoice, baseConfig)
    expect(html).toContain('£0.00')
  })

  it('omits the notes section when notes is null', () => {
    const html = generateInvoiceHtml({ ...baseInvoice, notes: null }, baseConfig)
    // The template has a <!-- Notes --> comment, so check for the rendered heading element
    expect(html).not.toContain('Notes</p>')
  })

  it('renders notes section when notes is present', () => {
    const invoice = { ...baseInvoice, notes: 'Please bring the dog lead.' }
    const html = generateInvoiceHtml(invoice, baseConfig)
    expect(html).toContain('Notes</p>')
    expect(html).toContain('Please bring the dog lead.')
  })

  it('uses fallback business name when config.businessName is absent', () => {
    const html = generateInvoiceHtml(baseInvoice, {})
    expect(html).toContain('Whitstable Dog Care') // hard-coded fallback
  })

  it('omits dog breed section when both dog_name and dog_breed are null', () => {
    const invoice = { ...baseInvoice, dog_name: null, dog_breed: null }
    const html = generateInvoiceHtml(invoice, baseConfig)
    expect(html).not.toContain('🐾')
  })

})
