export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import PrintButton from '../PrintButton'

function fmtDate(val: string | null | undefined): string {
  if (!val) return '—'
  try { return new Date(val).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return val }
}

interface ServiceLine {
  description?: string
  date?: string
  rate?: number
  quantity?: number
  total?: number
}

function parseServices(val: string | null): ServiceLine[] {
  if (!val) return []
  try { return JSON.parse(val) } catch { return [] }
}

export default async function InvoiceExportPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { invoice_date: 'desc' },
  })

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0)
  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0)
  const totalUnpaid = invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + i.total, 0)
  const unpaidInvoices = invoices.filter(i => i.status !== 'Paid')

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .screen-only { }
        @media print {
          header, .screen-only { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }
          .inv-card { page-break-inside: avoid; }
        }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding: 4px 8px 4px 0; }
        td { font-size: 12px; color: #111; padding: 4px 8px 4px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
      `}</style>

      {/* Print button */}
      <div className="screen-only" style={{ background: '#2d6a4f', color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600 }}>Invoices Export — Print / Save as PDF</span>
        <PrintButton />
      </div>

      <div style={{ padding: '24px 32px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

        {/* Cover */}
        <div style={{ marginBottom: 28, paddingBottom: 16, borderBottom: '2px solid #2d6a4f' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#2d6a4f' }}>Whitstable Dog Care</div>
          <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>Invoices Export — {today}</div>
          <div style={{ display: 'flex', gap: 32, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#9ca3af' }}>Total Invoiced</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginTop: 2 }}>£{totalInvoiced.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#9ca3af' }}>Paid</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#065f46', marginTop: 2 }}>£{totalPaid.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#9ca3af' }}>Outstanding</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: unpaidInvoices.length > 0 ? '#b45309' : '#065f46', marginTop: 2 }}>£{totalUnpaid.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#9ca3af' }}>Total Invoices</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginTop: 2 }}>{invoices.length}</div>
            </div>
          </div>
        </div>

        {/* Unpaid summary */}
        {unpaidInvoices.length > 0 && (
          <div style={{ marginBottom: 28, padding: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#92400e', marginBottom: 10 }}>
              Outstanding Invoices ({unpaidInvoices.length})
            </div>
            <div style={{ overflowX: 'auto' }}><table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Dog</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {unpaidInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2d6a4f' }}>#{inv.invoice_number}</td>
                    <td>{inv.client_name || '—'}</td>
                    <td>{inv.dog_name || '—'}</td>
                    <td>{fmtDate(inv.invoice_date)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>£{inv.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}

        {/* All invoices */}
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#2d6a4f', borderBottom: '1px solid #e5e7eb', paddingBottom: 4, marginBottom: 16 }}>
          All Invoices
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {invoices.map(inv => {
            const services = parseServices(inv.services)
            return (
              <div key={inv.id} className="inv-card" style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: inv.status === 'Paid' ? '#f9fafb' : '#fffdf0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#2d6a4f' }}>#{inv.invoice_number}</span>
                    {inv.client_name && <span style={{ fontSize: 13, fontWeight: 600, color: '#111', marginLeft: 12 }}>{inv.client_name}</span>}
                    {inv.dog_name && <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>({inv.dog_name})</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
                      background: inv.status === 'Paid' ? '#d1fae5' : '#fef3c7',
                      color: inv.status === 'Paid' ? '#065f46' : '#92400e',
                    }}>{inv.status === 'Paid' ? '✓ Paid' : 'Unpaid'}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>£{inv.total.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 24, fontSize: 11, color: '#6b7280', marginBottom: services.length > 0 ? 8 : 0 }}>
                  {inv.invoice_date && <span>Issued: {fmtDate(inv.invoice_date)}</span>}
                  {inv.due_date && <span>Due: {fmtDate(inv.due_date)}</span>}
                  {inv.paid_date && <span>Paid: {fmtDate(inv.paid_date)}</span>}
                </div>

                {services.length > 0 && (
                  <div style={{ overflowX: 'auto' }}><table style={{ marginTop: 4 }}>
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Date</th>
                        <th style={{ textAlign: 'right' }}>Rate</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((s, i) => (
                        <tr key={i}>
                          <td>{s.description || '—'}</td>
                          <td>{s.date ? fmtDate(s.date) : '—'}</td>
                          <td style={{ textAlign: 'right' }}>{s.rate != null ? `£${s.rate.toFixed(2)}` : '—'}</td>
                          <td style={{ textAlign: 'right' }}>{s.quantity ?? '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{s.total != null ? `£${s.total.toFixed(2)}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}

                {inv.notes && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>Note: {inv.notes}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
