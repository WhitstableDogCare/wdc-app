import fs from 'fs'
import path from 'path'

interface ServiceLine {
  id: string
  type: 'boarding' | 'daycare'
  description: string
  startDate: string
  endDate: string
  quantity: number
  rate: number
}

interface InvoiceRow {
  invoice_number: string
  invoice_date: string | null
  due_date: string | null
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  client_address: string | null
  dog_name: string | null
  dog_breed: string | null
  services: string
  notes: string | null
  apply_discount: boolean
  total: number
}

interface Config {
  businessName?: string
  businessAddress?: string
  businessEmail?: string
  businessPhone?: string
  paymentInfo?: string
}

function fmt(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function nights(s: ServiceLine): number {
  if (s.type !== 'boarding' || !s.startDate || !s.endDate) return s.quantity
  const diff = Math.round(
    (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 86400000
  )
  return Math.max(0, diff)
}

function serviceAmount(s: ServiceLine): number {
  return nights(s) * s.rate
}

function qtyLabel(s: ServiceLine): string {
  const n = nights(s)
  return s.type === 'boarding'
    ? `${n} night${n !== 1 ? 's' : ''}`
    : `${n} day${n !== 1 ? 's' : ''}`
}

function dateRange(s: ServiceLine): string {
  if (!s.startDate) return ''
  if (s.type === 'boarding' && s.endDate)
    return `${fmt(s.startDate)} – ${fmt(s.endDate)}`
  return fmt(s.startDate)
}

function esc(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function nl2br(str: string | null | undefined): string {
  if (!str) return ''
  return esc(str).replace(/\n/g, '<br>')
}

export function generateInvoiceHtml(invoice: InvoiceRow, config: Config): string {
  const services: ServiceLine[] = (() => {
    try { return JSON.parse(invoice.services) } catch { return [] }
  })()

  const subtotal = services.reduce((sum, s) => sum + serviceAmount(s), 0)
  const total = invoice.apply_discount ? subtotal * 0.9 : subtotal

  // Embed logo as base64
  let logoHtml = ''
  try {
    const logoPath = path.join(process.cwd(), 'public', 'wdc-logo.png')
    const logoData = fs.readFileSync(logoPath).toString('base64')
    logoHtml = `<img src="data:image/png;base64,${logoData}" style="max-height:64px;max-width:192px;object-fit:contain;margin-bottom:8px;" alt="Whitstable Dog Care">`
  } catch {
    // logo not found, skip
  }

  const serviceRows = services.map(s => `
    <tr>
      <td style="padding:10px 12px;color:#1e293b;border-bottom:1px solid #f1f5f9;">${esc(s.description) || (s.type === 'boarding' ? 'Dog Boarding' : 'Dog Daycare')}</td>
      <td style="padding:10px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">${esc(dateRange(s))}</td>
      <td style="padding:10px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;text-align:right;">${esc(qtyLabel(s))}</td>
      <td style="padding:10px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;text-align:right;">£${s.rate.toFixed(2)}</td>
      <td style="padding:10px 12px;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9;text-align:right;">£${serviceAmount(s).toFixed(2)}</td>
    </tr>
  `).join('')

  const discountRows = invoice.apply_discount ? `
    <tr>
      <td colspan="4" style="text-align:right;padding:4px 12px;color:#64748b;font-size:13px;">Subtotal</td>
      <td style="text-align:right;padding:4px 12px;color:#64748b;font-size:13px;">£${subtotal.toFixed(2)}</td>
    </tr>
    <tr>
      <td colspan="4" style="text-align:right;padding:4px 12px;color:#64748b;font-size:13px;">Loyalty discount (10%)</td>
      <td style="text-align:right;padding:4px 12px;color:#64748b;font-size:13px;">−£${(subtotal * 0.1).toFixed(2)}</td>
    </tr>
  ` : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: white; padding: 40px; }
  </style>
</head>
<body>
  <div style="max-width:680px;margin:0 auto;">

    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;">
      <div>
        ${logoHtml}
        <h1 style="font-size:18px;font-weight:700;color:#0f172a;">${esc(config.businessName) || 'Whitstable Dog Care'}</h1>
        ${config.businessAddress ? `<p style="font-size:13px;color:#94a3b8;margin-top:4px;">${nl2br(config.businessAddress)}</p>` : ''}
        ${config.businessPhone ? `<p style="font-size:13px;color:#94a3b8;">${esc(config.businessPhone)}</p>` : ''}
        ${config.businessEmail ? `<p style="font-size:13px;color:#94a3b8;">${esc(config.businessEmail)}</p>` : ''}
      </div>
      <div style="text-align:right;">
        <p style="font-size:28px;font-weight:300;color:#cbd5e1;text-transform:uppercase;letter-spacing:4px;">Invoice</p>
        <p style="font-size:13px;font-weight:600;color:#334155;margin-top:4px;">#${esc(invoice.invoice_number)}</p>
        ${invoice.invoice_date ? `<p style="font-size:13px;color:#94a3b8;">Date: ${fmt(invoice.invoice_date)}</p>` : ''}
        ${invoice.due_date ? `<p style="font-size:13px;color:#94a3b8;">Due: ${fmt(invoice.due_date)}</p>` : ''}
      </div>
    </div>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin-bottom:24px;">

    <!-- Bill To -->
    <div style="margin-bottom:32px;">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;margin-bottom:8px;">Bill To</p>
      ${invoice.client_name ? `<p style="font-weight:600;color:#0f172a;">${esc(invoice.client_name)}</p>` : ''}
      ${invoice.client_email ? `<p style="font-size:13px;color:#475569;">${esc(invoice.client_email)}</p>` : ''}
      ${invoice.client_phone ? `<p style="font-size:13px;color:#475569;">${esc(invoice.client_phone)}</p>` : ''}
      ${invoice.client_address ? `<p style="font-size:13px;color:#475569;">${nl2br(invoice.client_address)}</p>` : ''}
      ${invoice.dog_name || invoice.dog_breed ? `<p style="font-size:13px;color:#475569;margin-top:8px;">🐾 <strong>${esc(invoice.dog_name)}</strong>${invoice.dog_breed ? ` (${esc(invoice.dog_breed)})` : ''}</p>` : ''}
    </div>

    <!-- Services table -->
    ${services.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;background:#f8fafc;">Service</th>
          <th style="text-align:left;padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;background:#f8fafc;">Dates</th>
          <th style="text-align:right;padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;background:#f8fafc;">Qty</th>
          <th style="text-align:right;padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;background:#f8fafc;">Rate</th>
          <th style="text-align:right;padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;background:#f8fafc;">Amount</th>
        </tr>
      </thead>
      <tbody>${serviceRows}</tbody>
      <tfoot>
        ${discountRows}
        <tr>
          <td colspan="4" style="text-align:right;padding:12px;font-weight:600;color:#334155;">Total</td>
          <td style="text-align:right;padding:12px;font-size:18px;font-weight:700;color:#0f172a;">£${total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    ` : ''}

    <!-- Notes -->
    ${invoice.notes ? `
    <div style="margin-bottom:24px;">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;margin-bottom:8px;">Notes</p>
      <p style="font-size:13px;color:#475569;">${nl2br(invoice.notes)}</p>
    </div>
    ` : ''}

    <!-- Payment details -->
    ${config.paymentInfo ? `
    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;margin-bottom:8px;">Payment Details</p>
      <p style="font-size:13px;color:#475569;">${nl2br(config.paymentInfo)}</p>
    </div>
    ` : ''}

    <p style="text-align:center;font-size:11px;color:#cbd5e1;margin-top:32px;">Thank you for your business!</p>
  </div>
</body>
</html>`
}
