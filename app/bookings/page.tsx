'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHead, Btn, Card, Pill } from '../components/ui'

const UNAVAILABLE_REASONS = ['Holiday', 'Illness', 'Personal', 'Other']

interface Booking {
  id: number
  dog_name: string
  owner_name: string | null
  booking_type: string
  service_type: string | null
  rate_type: string
  start_date: string
  end_date: string | null
  status: string
  confirmation_sent: boolean
  dog: { id: number; name: string; photo_path: string | null; is_solo: boolean } | null
}

interface UnavailablePeriod {
  id: number
  start_date: string
  end_date: string
  reason: string
}

interface Invoice {
  id: number
  invoice_number: string
  invoice_date: string | null
  due_date: string | null
  dog_name: string | null
  client_name: string | null
  total: number
  status: string
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtInvoiceDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function nightsBetween(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)
}

function bookingPillColor(type: string): 'purple' | 'gold' | 'neutral' {
  if (type === 'Boarding' || type === 'Boarding Trial') return 'purple'
  if (type === 'Daycare' || type === 'Daycare Trial') return 'gold'
  return 'neutral'
}

function BookingCard({ booking }: { booking: Booking }) {
  const isBoarding = booking.booking_type === 'Boarding'
  const isCancelled = booking.status === 'Cancelled'
  const nights = isBoarding && booking.end_date ? nightsBetween(booking.start_date, booking.end_date) : null

  return (
    <Link href={`/bookings/${booking.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--surface-2)', borderRadius: 12,
        border: `1px solid var(--border)`,
        padding: '12px 14px',
        opacity: isCancelled ? 0.5 : 1,
      }}>
      {booking.dog?.photo_path ? (
        <img src={booking.dog.photo_path} alt={booking.dog_name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--tint-neutral)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2 .336-3.5 2.098-3.5 4 0 .801.07 1.6.14 2.4C3 11.5 3 13 3 13.5c0 2.5 2 4.5 4.5 4.5S12 16 12 13.5"/>
            <circle cx="17" cy="15" r="2.5"/>
          </svg>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
          <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{booking.dog_name}</p>
          <Pill color={bookingPillColor(booking.booking_type)}>{booking.booking_type}</Pill>
          {booking.dog?.is_solo && <Pill color="amber">Solo</Pill>}
          {booking.rate_type === 'Peak' && <Pill color="amber">Peak</Pill>}
          {isCancelled && <Pill color="red">Cancelled</Pill>}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {formatDate(booking.start_date)}
          {isBoarding && booking.end_date ? ` → ${formatDate(booking.end_date)}${nights ? ` · ${nights} night${nights !== 1 ? 's' : ''}` : ''}` : ''}
          {booking.service_type ? ` · ${booking.service_type}` : ''}
        </p>
        {booking.owner_name && <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>{booking.owner_name}</p>}
      </div>
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 500, margin: '0 0 8px' }}>
      {children}
    </p>
  )
}

function BookingsTab() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')

  useEffect(() => {
    fetch('/api/bookings').then(r => r.json()).then(data => {
      setBookings(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  let displayList: Booking[] = []

  if (filter === 'upcoming') {
    displayList = bookings.filter(b => {
      const end = new Date((b.end_date ?? b.start_date) + 'T23:59:00')
      return end >= now && b.status !== 'Cancelled'
    }).sort((a, b) => a.start_date.localeCompare(b.start_date))
  } else if (filter === 'past') {
    displayList = bookings.filter(b => {
      const end = new Date((b.end_date ?? b.start_date) + 'T23:59:00')
      return end < now || b.status === 'Cancelled'
    })
  } else {
    displayList = bookings
  }

  const groups: Record<string, Booking[]> = {}
  for (const b of displayList) {
    const key = new Date(b.start_date + 'T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-app)', borderRadius: 10, padding: 4, marginBottom: 20, alignSelf: 'flex-start' }}>
        {(['upcoming', 'past', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.06em',
              background: filter === f ? 'var(--surface-2)' : 'transparent',
              color: filter === f ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: filter === f ? 'var(--sh-sm)' : 'none',
              border: 'none', cursor: 'pointer', transition: 'all 150ms',
            }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Loading…</div>
      ) : displayList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 13, fontWeight: 500 }}>{filter === 'upcoming' ? 'No upcoming bookings' : 'No bookings found'}</p>
          <Link href="/bookings/new" style={{ color: 'var(--cta-purple)', fontSize: 13, display: 'inline-block', marginTop: 8 }}>Create one →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(groups).map(([month, group]) => (
            <div key={month}>
              <SectionLabel>{month}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.map((b, i) => <BookingCard key={`${b.id}-${i}`} booking={b} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function groupUnavailableByMonth(periods: UnavailablePeriod[]) {
  const groups: Record<string, UnavailablePeriod[]> = {}
  for (const p of periods) {
    const key = new Date(p.start_date + 'T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  }
  return groups
}

function UnavailableTab() {
  const [periods, setPeriods] = useState<UnavailablePeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('Holiday')
  const [submitting, setSubmitting] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const load = () => {
    fetch('/api/unavailable-periods')
      .then(r => r.json())
      .then(data => { setPeriods(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const upcoming = periods.filter(p => p.end_date >= today)
  const groups = groupUnavailableByMonth(upcoming)

  const handleAdd = async () => {
    setError(null); setWarning(null)
    if (!startDate || !endDate) { setError('Please select both dates.'); return }
    if (endDate < startDate) { setError('End date must be on or after start date.'); return }
    setSubmitting(true)
    const res = await fetch('/api/unavailable-periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, reason }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed to save.'); return }
    if (data.overlappingBookings?.length > 0) {
      const names = data.overlappingBookings.map((b: { dog_name: string }) => b.dog_name).join(', ')
      setWarning(`Heads up: this period overlaps with existing bookings for ${names}.`)
    }
    setShowForm(false); setStartDate(''); setEndDate(''); setReason('Holiday')
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this unavailable period?')) return
    setDeletingId(id)
    await fetch(`/api/unavailable-periods/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    load()
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Dates when you&apos;re not taking bookings.</p>
        <Btn size="sm" variant="secondary" onClick={() => { setShowForm(v => !v); setError(null); setWarning(null) }}>
          {showForm ? 'Cancel' : '+ Add'}
        </Btn>
      </div>

      {warning && (
        <div style={{ marginBottom: 12, background: 'var(--tint-amber)', border: '1px solid var(--tint-amber-text)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--tint-amber-text)' }}>
          {warning}
        </div>
      )}

      {showForm && (
        <div style={{ marginBottom: 14, background: 'var(--surface-app)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label>From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={today} style={{ width: '100%', marginTop: 4 }} />
            </div>
            <div>
              <label>To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || today} style={{ width: '100%', marginTop: 4 }} />
            </div>
          </div>
          <div>
            <label>Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
              {UNAVAILABLE_REASONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          {error && <p style={{ fontSize: 12, color: 'var(--tint-red-text)' }}>{error}</p>}
          <Btn onClick={handleAdd} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</Btn>
        </div>
      )}

      {loading && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</p>}

      {!loading && upcoming.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 13, fontWeight: 500 }}>No upcoming unavailable periods</p>
        </div>
      )}

      {!loading && upcoming.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(groups).map(([month, monthPeriods]) => (
            <div key={month}>
              <SectionLabel>{month}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {monthPeriods.map(p => (
                  <div key={p.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'center', minWidth: 36 }}>
                        <p style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1 }}>{new Date(p.start_date + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short' })}</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1.2 }}>{new Date(p.start_date + 'T12:00:00').getDate()}</p>
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, margin: 0 }}>{p.reason}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {p.start_date === p.end_date ? fmtDate(p.start_date) : <>{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</>}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                      style={{ fontSize: 12, color: 'var(--tint-red-text)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, opacity: deletingId === p.id ? 0.5 : 1 }}>
                      {deletingId === p.id ? '…' : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function InvoicesTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/invoices')
      .then(r => r.json())
      .then(data => { setInvoices(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const unpaid = invoices.filter(inv => inv.status !== 'Paid' && inv.status !== 'Void')
  const paid   = invoices.filter(inv => inv.status === 'Paid').sort((a, b) => (b.due_date ?? '').localeCompare(a.due_date ?? ''))

  const InvoiceTable = ({ rows }: { rows: Invoice[] }) => (
    <Card style={{ padding: 0, overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Invoice #', 'Dog', 'Owner', 'Due', 'Total'].map((h, i) => (
              <th key={h} style={{ textAlign: i === 4 ? 'right' : 'left', padding: '10px 14px', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(inv => (
            <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }} className="inv-row">
              <td style={{ padding: '10px 14px' }}>
                <Link href={`/invoices/${inv.id}`} style={{ fontFamily: 'var(--font-label)', fontWeight: 600, color: 'var(--cta-purple)', fontSize: 12 }}>
                  #{inv.invoice_number}
                </Link>
              </td>
              <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text)' }}>{inv.dog_name || '—'}</td>
              <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{inv.client_name || '—'}</td>
              <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{fmtInvoiceDate(inv.due_date)}</td>
              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>£{inv.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {!loading && invoices.length > 0 && (
            <span><span style={{ color: 'var(--tint-amber-text)', fontWeight: 600 }}>{unpaid.length}</span> unpaid · <span style={{ color: 'var(--tint-green-text)', fontWeight: 600 }}>{paid.length}</span> paid</span>
          )}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn size="sm" variant="secondary" href="/invoices/bulk">Send Invoices</Btn>
          <Btn size="sm" href="/invoices/new">+ New Invoice</Btn>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Loading…</div>
      ) : invoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 13, fontWeight: 500 }}>No invoices yet</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Create your first invoice to get started</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <SectionLabel>Unpaid ({unpaid.length})</SectionLabel>
            {unpaid.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px', background: 'var(--surface-2)', borderRadius: 12 }}>No unpaid invoices</p>
              : <InvoiceTable rows={unpaid} />
            }
          </div>
          {paid.length > 0 && (
            <div>
              <SectionLabel>Paid ({paid.length})</SectionLabel>
              <InvoiceTable rows={paid} />
            </div>
          )}
        </div>
      )}
      <style>{`.inv-row:hover { background: var(--surface-app); }`}</style>
    </>
  )
}

export default function BookingsInvoicesPage() {
  const [activeTab, setActiveTab] = useState<'bookings' | 'invoices' | 'unavailable'>('bookings')

  return (
    <div style={{ maxWidth: 860 }}>
      <PageHead title="Bookings & Invoices">
        <Btn href="/bookings/new">+ New Booking</Btn>
      </PageHead>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-app)', borderRadius: 10, padding: 4, marginBottom: 20, alignSelf: 'flex-start', width: 'fit-content' }}>
        {(['bookings', 'invoices', 'unavailable'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              fontFamily: 'var(--font-label)', textTransform: 'capitalize', letterSpacing: '0.06em',
              background: activeTab === tab ? 'var(--surface-2)' : 'transparent',
              color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: activeTab === tab ? 'var(--sh-sm)' : 'none',
              border: 'none', cursor: 'pointer', transition: 'all 150ms',
            }}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'bookings' && <BookingsTab />}
      {activeTab === 'invoices' && <InvoicesTab />}
      {activeTab === 'unavailable' && <UnavailableTab />}
    </div>
  )
}
