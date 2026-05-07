'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHead, Pill } from '../../components/ui'

interface PendingBooking {
  id: number
  dog_name: string
  dog_breed: string | null
  owner_name: string | null
  owner_email: string | null
  booking_type: string
  start_date: string
  end_date: string | null
  drop_off_time: string | null
  pick_up_time: string | null
  has_email: boolean
}

interface SendResult {
  bookingId: number
  dogName: string
  status: 'sent' | 'skipped'
  reason?: string
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function BulkInvoicePage() {
  const [bookings, setBookings] = useState<PendingBooking[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<SendResult[] | null>(null)

  useEffect(() => {
    fetch('/api/invoices/bulk')
      .then(r => r.json())
      .then(data => {
        setBookings(data)
        setSelected(new Set(data.filter((b: PendingBooking) => b.has_email).map((b: PendingBooking) => b.id)))
        setLoading(false)
      })
  }, [])

  const toggleAll = () => {
    const eligible = bookings.filter(b => b.has_email).map(b => b.id)
    if (eligible.every(id => selected.has(id))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(eligible))
    }
  }

  const toggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSend = async () => {
    if (!selected.size) return
    if (!confirm(`Send invoices to ${selected.size} client${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    setSending(true)
    const res = await fetch('/api/invoices/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingIds: Array.from(selected) }),
    })
    const data = await res.json()
    setResults(data.results ?? [])
    const sentIds = new Set((data.results ?? []).filter((r: SendResult) => r.status === 'sent').map((r: SendResult) => r.bookingId))
    setBookings(prev => prev.filter(b => !sentIds.has(b.id)))
    setSelected(new Set())
    setSending(false)
  }

  const eligibleCount = bookings.filter(b => b.has_email).length

  return (
    <div style={{ maxWidth: 640 }}>
      <PageHead title="Send Invoices" sub="Upcoming confirmed bookings without an invoice" />

      {/* Results */}
      {results && (
        <div style={{ marginBottom: 20, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: '14px 18px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Done — here&apos;s what happened:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {results.map(r => (
              <div key={r.bookingId} style={{ fontSize: 13 }}>
                {r.status === 'sent'
                  ? <span style={{ color: 'var(--tint-green-text)' }}>{r.dogName} — invoice sent</span>
                  : <span style={{ color: 'var(--tint-amber-text)' }}>{r.dogName} — skipped ({r.reason})</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Loading…</div>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)' }}>
          <p style={{ fontSize: 24, margin: '0 0 8px' }}>✓</p>
          <p style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>All upcoming bookings have been invoiced</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Nothing left to do here.</p>
        </div>
      ) : (
        <>
          {/* Select all + send */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text)', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={eligibleCount > 0 && bookings.filter(b => b.has_email).every(b => selected.has(b.id))}
                onChange={toggleAll}
                style={{ width: 16, height: 16 }}
              />
              Select all ({eligibleCount} with email)
            </label>
            <button
              onClick={handleSend}
              disabled={sending || selected.size === 0}
              style={{
                background: 'var(--cta-purple)', color: '#fff', border: 'none',
                borderRadius: 'var(--density-radius-pill)', padding: '8px 18px',
                fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-label)',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: sending || selected.size === 0 ? 'not-allowed' : 'pointer',
                opacity: sending || selected.size === 0 ? 0.5 : 1,
              }}
            >
              {sending ? 'Sending…' : `Send ${selected.size > 0 ? selected.size : ''} Invoice${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>

          {/* Booking list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bookings.map(b => (
              <div key={b.id} style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--density-radius-card)', padding: '12px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
                opacity: b.has_email ? 1 : 0.55,
              }}>
                <input
                  type="checkbox"
                  checked={selected.has(b.id)}
                  onChange={() => toggleOne(b.id)}
                  disabled={!b.has_email}
                  style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{b.dog_name}</span>
                    {b.dog_breed && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.dog_breed}</span>}
                    <Pill color={b.booking_type.startsWith('Boarding') ? 'purple' : 'gold'}>{b.booking_type}</Pill>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text)', margin: '0 0 2px' }}>
                    {formatDate(b.start_date)}{b.end_date ? ` → ${formatDate(b.end_date)}` : ''}
                  </p>
                  {b.owner_name && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 1px' }}>{b.owner_name}</p>}
                  {b.owner_email
                    ? <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{b.owner_email}</p>
                    : <p style={{ fontSize: 11, color: 'var(--tint-red-text)', fontWeight: 600, margin: 0 }}>No email — cannot invoice</p>
                  }
                </div>
                <Link href={`/bookings/${b.id}`} style={{ fontSize: 12, color: 'var(--cta-purple)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  View →
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
