'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import InvoicePrint, { type ServiceLine, type BusinessSettings } from '@/app/components/InvoicePrint'
import { Btn, Pill } from '../../components/ui'

interface Invoice {
  id: number
  invoice_number: string
  dog_id: number | null
  booking_id: number | null
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  client_address: string | null
  dog_name: string | null
  dog_breed: string | null
  services: string
  notes: string | null
  invoice_date: string | null
  due_date: string | null
  apply_discount: boolean
  total: number
  status: string
  paid_date: string | null
  payment_method: string | null
}

interface Booking {
  id: number
  dog_name: string
  owner_name: string | null
  booking_type: string
  start_date: string
  end_date: string | null
  invoice: { id: number; invoice_number: string } | null
}

interface Config {
  businessName?: string
  businessAddress?: string
  businessEmail?: string
  businessPhone?: string
  paymentInfo?: string
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [config, setConfig] = useState<Config>({})
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [togglingPaid, setTogglingPaid] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [emailResult, setEmailResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [bookingSearch, setBookingSearch] = useState('')
  const [bookingResults, setBookingResults] = useState<Booking[]>([])
  const [bookingSearchLoading, setBookingSearchLoading] = useState(false)
  const [linkingBooking, setLinkingBooking] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/invoices/${id}`).then(r => r.json()),
      fetch('/api/config').then(r => r.json()),
    ]).then(([inv, cfg]) => {
      setInvoice(inv)
      setConfig(cfg)
      setEmailTo(inv.client_email ?? '')
      setLoading(false)
    })
  }, [id])

  const handleSendEmail = async () => {
    setSending(true)
    setEmailResult(null)
    try {
      const res = await fetch(`/api/invoices/${id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, message: emailMessage }),
      })
      const data = await res.json()
      if (res.ok) {
        setEmailResult({ ok: true, msg: `Invoice sent to ${emailTo}` })
      } else {
        setEmailResult({ ok: false, msg: data.error ?? 'Failed to send email' })
      }
    } catch {
      setEmailResult({ ok: false, msg: 'Network error — could not send email' })
    }
    setSending(false)
  }

  const handleTogglePaid = async (paymentMethod?: string) => {
    if (!invoice) return
    setTogglingPaid(true)
    setShowPaymentModal(false)
    const isPaid = invoice.status === 'Paid'
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: isPaid ? 'Unpaid' : 'Paid',
        paid_date: isPaid ? null : new Date().toISOString().split('T')[0],
        payment_method: isPaid ? null : (paymentMethod ?? null),
      }),
    })
    const updated = await res.json()
    setInvoice(inv => inv ? { ...inv, status: updated.status, paid_date: updated.paid_date, payment_method: updated.payment_method } : inv)
    setTogglingPaid(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    router.push('/invoices')
  }

  const handleBookingSearch = async (q: string) => {
    setBookingSearch(q)
    if (q.trim().length < 2) { setBookingResults([]); return }
    setBookingSearchLoading(true)
    const res = await fetch('/api/bookings')
    const all: Booking[] = await res.json()
    const lower = q.toLowerCase()
    setBookingResults(
      all.filter(b =>
        b.dog_name.toLowerCase().includes(lower) ||
        (b.owner_name ?? '').toLowerCase().includes(lower) ||
        b.start_date.includes(q)
      ).slice(0, 8)
    )
    setBookingSearchLoading(false)
  }

  const handleLinkBooking = async (bookingId: number) => {
    setLinkingBooking(true)
    setLinkError(null)
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId }),
    })
    if (res.ok) {
      setInvoice(inv => inv ? { ...inv, booking_id: bookingId } : inv)
      setShowLinkModal(false)
      setBookingSearch('')
      setBookingResults([])
    } else {
      const data = await res.json()
      setLinkError(data.error ?? 'Failed to link booking')
    }
    setLinkingBooking(false)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Loading…</div>
  if (!invoice) return <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Invoice not found</div>

  const services: ServiceLine[] = (() => { try { return JSON.parse(invoice.services) } catch { return [] } })()

  const business: BusinessSettings = {
    name: config.businessName ?? 'Whitstable Dog Care',
    address: config.businessAddress ?? '',
    email: config.businessEmail ?? '',
    phone: config.businessPhone ?? '',
    paymentInfo: config.paymentInfo ?? '',
  }

  const invoiceData = {
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date ?? '',
    dueDate: invoice.due_date ?? '',
    clientName: invoice.client_name ?? '',
    clientEmail: invoice.client_email ?? '',
    clientPhone: invoice.client_phone ?? '',
    clientAddress: invoice.client_address ?? '',
    dogName: invoice.dog_name ?? '',
    dogBreed: invoice.dog_breed ?? '',
    services,
    notes: invoice.notes ?? '',
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Action bar — hidden on print */}
      <div className="print:hidden" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/bookings" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>← Invoices</Link>
          <Pill color={invoice.status === 'Paid' ? 'green' : 'amber'}>
            {invoice.status === 'Paid'
              ? `Paid${invoice.payment_method ? ` · ${invoice.payment_method}` : ''}${invoice.paid_date ? ` · ${new Date(invoice.paid_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`
              : 'Unpaid'}
          </Pill>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => invoice.status === 'Paid' ? handleTogglePaid() : setShowPaymentModal(true)}
            disabled={togglingPaid}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-label)', letterSpacing: '0.06em', textTransform: 'uppercase',
              cursor: togglingPaid ? 'not-allowed' : 'pointer', opacity: togglingPaid ? 0.6 : 1,
              border: invoice.status === 'Paid' ? '1px solid var(--border)' : 'none',
              background: invoice.status === 'Paid' ? 'var(--surface-3)' : 'var(--tint-green-text)',
              color: invoice.status === 'Paid' ? 'var(--text)' : '#fff',
            }}
          >
            {togglingPaid ? '…' : invoice.status === 'Paid' ? 'Mark Unpaid' : 'Mark as Paid'}
          </button>
          <button
            onClick={() => { setShowEmailModal(true); setEmailResult(null) }}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-label)', letterSpacing: '0.06em', textTransform: 'uppercase',
              border: '1px solid var(--cta-purple)', color: 'var(--cta-purple)', background: 'transparent', cursor: 'pointer',
            }}
          >
            Email
          </button>
          <button
            onClick={() => window.print()}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-label)', letterSpacing: '0.06em', textTransform: 'uppercase',
              background: 'var(--cta-purple)', color: '#fff', border: 'none', cursor: 'pointer',
            }}
          >
            Print / PDF
          </button>

          {/* Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(m => !m)}
              style={{
                padding: '7px 12px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                border: '1px solid var(--border)', background: 'var(--surface-3)', color: 'var(--text)', cursor: 'pointer',
              }}
            >
              ⋯
            </button>
            {showMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowMenu(false)} />
                <div style={{
                  position: 'absolute', right: 0, marginTop: 4, width: 200,
                  background: 'var(--surface-2)', borderRadius: 12, boxShadow: 'var(--sh-lg)',
                  border: '1px solid var(--border)', zIndex: 20, overflow: 'hidden',
                }}>
                  <Link
                    href={`/invoices/${id}/edit`}
                    onClick={() => setShowMenu(false)}
                    style={{ display: 'block', padding: '10px 16px', fontSize: 13, color: 'var(--text)', textDecoration: 'none' }}
                  >
                    Edit invoice
                  </Link>
                  {invoice.dog_id && (
                    <Link
                      href={`/invoices/new?dogId=${invoice.dog_id}`}
                      onClick={() => setShowMenu(false)}
                      style={{ display: 'block', padding: '10px 16px', fontSize: 13, color: 'var(--text)', textDecoration: 'none', borderTop: '1px solid var(--border)' }}
                    >
                      New invoice for same dog
                    </Link>
                  )}
                  {!invoice.booking_id && (
                    <button
                      onClick={() => { setShowMenu(false); setShowLinkModal(true); setLinkError(null) }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 13,
                        color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      Link to booking
                    </button>
                  )}
                  <button
                    onClick={() => { setShowMenu(false); handleDelete() }}
                    disabled={deleting}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 13,
                      color: 'var(--tint-red-text)', background: 'none', border: 'none', cursor: 'pointer',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    {deleting ? 'Deleting…' : 'Delete invoice'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Invoice */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', overflow: 'hidden' }}>
        <InvoicePrint invoice={invoiceData} business={business} applyDiscount={invoice.apply_discount} />
      </div>

      {/* Payment modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--surface-2)', borderRadius: 20, boxShadow: 'var(--sh-lg)', padding: 24, width: '100%', maxWidth: 340, margin: '0 16px' }}>
            <h2 style={{ fontSize: 18, fontFamily: 'var(--font-display)', color: 'var(--text)', margin: '0 0 6px', fontWeight: 400 }}>How was this paid?</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>Select the payment method for your records.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => handleTogglePaid('Bank Transfer')}
                style={{ padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'var(--tint-blue)', color: 'var(--tint-blue-text)', border: '1px solid var(--tint-blue-text)', cursor: 'pointer' }}
              >
                Bank Transfer
              </button>
              <button
                onClick={() => handleTogglePaid('Cash')}
                style={{ padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'var(--tint-green)', color: 'var(--tint-green-text)', border: '1px solid var(--tint-green-text)', cursor: 'pointer' }}
              >
                Cash
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{ padding: '10px', borderRadius: 12, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link to booking modal */}
      {showLinkModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--surface-2)', borderRadius: 20, boxShadow: 'var(--sh-lg)', padding: 24, width: '100%', maxWidth: 440, margin: '0 16px' }}>
            <h2 style={{ fontSize: 18, fontFamily: 'var(--font-display)', color: 'var(--text)', margin: '0 0 6px', fontWeight: 400 }}>Link to booking</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>Search by dog name, owner, or date (YYYY-MM-DD).</p>
            <input
              type="text"
              placeholder="e.g. Vinny, Jennifer, 2026-06-15"
              value={bookingSearch}
              onChange={e => handleBookingSearch(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
              autoFocus
            />
            {linkError && (
              <p style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8, background: 'var(--tint-red)', color: 'var(--tint-red-text)', marginBottom: 12 }}>{linkError}</p>
            )}
            {bookingSearchLoading && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Searching…</p>}
            {bookingResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {bookingResults.map(b => (
                  <button
                    key={b.id}
                    onClick={() => handleLinkBooking(b.id)}
                    disabled={linkingBooking}
                    style={{
                      textAlign: 'left', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                      background: 'var(--surface-3)', border: '1px solid var(--border)',
                      cursor: linkingBooking ? 'not-allowed' : 'pointer', color: 'var(--text)',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{b.dog_name}</span>
                    <span style={{ color: 'var(--text-muted)' }}> · {b.booking_type} · {b.start_date}{b.end_date ? ` → ${b.end_date}` : ''}</span>
                    {b.owner_name && <span style={{ color: 'var(--text-muted)' }}> · {b.owner_name}</span>}
                    {b.invoice && (
                      <span style={{ color: 'var(--tint-amber-text)', marginLeft: 6, fontSize: 12 }}>
                        (already linked to #{b.invoice.invoice_number})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Btn onClick={() => { setShowLinkModal(false); setBookingSearch(''); setBookingResults([]) }} variant="secondary">Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Email modal */}
      {showEmailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--surface-2)', borderRadius: 20, boxShadow: 'var(--sh-lg)', padding: 24, width: '100%', maxWidth: 440, margin: '0 16px' }}>
            <h2 style={{ fontSize: 18, fontFamily: 'var(--font-display)', color: 'var(--text)', margin: '0 0 16px', fontWeight: 400 }}>
              Email Invoice #{invoice.invoice_number}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>To</label>
                <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Message (optional)</label>
                <textarea
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  rows={5}
                  placeholder={`Please find your invoice #${invoice.invoice_number} attached.\n\nThank you for staying with Whitstable Dog Care!\n\nJack\nWhitstable Dog Care`}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
              {emailResult && (
                <p style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8, background: emailResult.ok ? 'var(--tint-green)' : 'var(--tint-red)', color: emailResult.ok ? 'var(--tint-green-text)' : 'var(--tint-red-text)' }}>
                  {emailResult.msg}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <Btn onClick={handleSendEmail} disabled={sending || !emailTo} variant="primary">
                {sending ? 'Sending…' : 'Send Invoice'}
              </Btn>
              <Btn onClick={() => setShowEmailModal(false)} variant="secondary">Close</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
