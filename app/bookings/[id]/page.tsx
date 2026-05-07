'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Btn, Pill } from '../../components/ui'

interface Booking {
  id: number
  dog_name: string
  owner_name: string | null
  owner_email: string | null
  booking_type: string
  service_type: string | null
  rate_type: string
  start_date: string
  end_date: string | null
  drop_off_time: string | null
  pick_up_time: string | null
  notes: string | null
  status: string
  confirmation_sent: boolean
  invoice_flagged: boolean
  google_event_id: string | null
  dog: { id: number; name: string; photo_path: string | null } | null
  invoice: { id: number; invoice_number: string; status: string; total: number } | null
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(t: string | null) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${ampm}`
}

function nightsBetween(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-label)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</p>
      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendResult, setResendResult] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/bookings/${id}`).then(r => r.json()).then(data => {
      setBooking(data)
      setLoading(false)
      if (!data.google_event_id) {
        fetch(`/api/bookings/${id}/sync-calendar`)
          .then(r => r.json())
          .then(result => {
            if (result.found) {
              setBooking((b: Booking | null) => b ? { ...b, google_event_id: result.google_event_id } : b)
            }
          })
          .catch(() => {})
      }
    })
  }, [id])

  const handleSyncCalendar = async () => {
    setSyncing(true)
    setSyncResult(null)
    const res = await fetch(`/api/bookings/${id}/sync-calendar`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setBooking(b => b ? { ...b, google_event_id: data.google_event_id } : b)
      setSyncResult('Synced to Google Calendar')
    } else {
      setSyncResult(data.error ?? 'Sync failed')
    }
    setSyncing(false)
  }

  const handleResendInvoice = async () => {
    if (!booking?.invoice) return
    setResending(true)
    setResendResult(null)
    const email = booking.owner_email
    if (!email) { setResendResult('No email address on this booking.'); setResending(false); return }
    const res = await fetch(`/api/invoices/${booking.invoice.id}/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email }),
    })
    setResendResult(res.ok ? 'Invoice resent' : 'Failed to resend invoice')
    setResending(false)
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this booking? This will also remove it from Google Calendar.')) return
    let voidInvoice = false
    if (booking?.invoice && booking.invoice.status !== 'Void') {
      voidInvoice = confirm(
        `This booking has invoice #${booking.invoice.invoice_number} (£${booking.invoice.total.toFixed(2)}) which is currently ${booking.invoice.status}.\n\nDo you also want to mark the invoice as Void?`
      )
    }
    setCancelling(true)
    const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (voidInvoice && booking?.invoice) {
      await fetch(`/api/invoices/${booking.invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Void' }),
      })
    }
    if (data.calendarWarning) alert(data.calendarWarning)
    router.push('/bookings')
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Loading…</div>
  if (!booking) return <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Booking not found.</div>

  const isBoarding = booking.booking_type === 'Boarding'
  const isCancelled = booking.status === 'Cancelled'
  const nights = isBoarding && booking.end_date ? nightsBetween(booking.start_date, booking.end_date) : null

  return (
    <div style={{ maxWidth: 520 }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Link href="/bookings" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Bookings
        </Link>
        <Btn href={`/bookings/${booking.id}/edit`} variant="primary">Edit</Btn>
      </div>

      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', boxShadow: 'var(--sh-sm)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {booking.dog?.photo_path ? (
            <img src={booking.dog.photo_path} alt={booking.dog_name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--tint-neutral)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2 .336-3.5 2.098-3.5 4 0 .801.07 1.6.14 2.4C3 11.5 3 13 3 13.5c0 2.5 2 4.5 4.5 4.5S12 16 12 13.5"/>
                <circle cx="17" cy="15" r="2.5"/>
              </svg>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, color: 'var(--text)', margin: 0 }}>
                {booking.dog_name}
              </h1>
              <Pill color={isBoarding ? 'purple' : 'gold'}>{booking.booking_type}</Pill>
              {isCancelled && <Pill color="red">Cancelled</Pill>}
            </div>
            {booking.dog && (
              <Link href={`/dogs/${booking.dog.id}`} style={{ fontSize: 12, color: 'var(--cta-purple)', textDecoration: 'none' }}>
                View dog profile
              </Link>
            )}
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FieldBlock label={isBoarding ? 'Drop-off' : 'Date'}>
              {formatDate(booking.start_date)}
              {booking.drop_off_time && (
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                  Drop-off: {formatTime(booking.drop_off_time)}
                </div>
              )}
            </FieldBlock>
            {isBoarding && booking.end_date ? (
              <FieldBlock label="Pick-up">
                {formatDate(booking.end_date)}
                {booking.pick_up_time && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                    Pick-up: {formatTime(booking.pick_up_time)}
                  </div>
                )}
                {nights !== null && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                    {nights} night{nights !== 1 ? 's' : ''}
                  </div>
                )}
              </FieldBlock>
            ) : !isBoarding && booking.pick_up_time ? (
              <FieldBlock label="Pick-up">
                {formatTime(booking.pick_up_time)}
              </FieldBlock>
            ) : null}
          </div>

          {booking.service_type && <FieldBlock label="Service">{booking.service_type}</FieldBlock>}
          <FieldBlock label="Rate">{booking.rate_type}</FieldBlock>
          {booking.owner_name && (
            <FieldBlock label="Owner">
              {booking.owner_name}
              {booking.owner_email && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{booking.owner_email}</div>
              )}
            </FieldBlock>
          )}
          {booking.notes && (
            <FieldBlock label="Notes">
              <span style={{ whiteSpace: 'pre-wrap' }}>{booking.notes}</span>
            </FieldBlock>
          )}

          {/* Status strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 10, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {booking.google_event_id
              ? <span style={{ fontSize: 11, color: 'var(--tint-green-text)', fontWeight: 600 }}>Calendar linked</span>
              : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No calendar event</span>
            }
            {booking.confirmation_sent && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Confirmation sent</span>
            )}
            {booking.invoice && (
              <Pill color={booking.invoice.status === 'Paid' ? 'green' : booking.invoice.status === 'Void' ? 'neutral' : 'amber'}>
                {booking.invoice.status === 'Paid'
                  ? 'Paid'
                  : booking.invoice.status === 'Void'
                  ? 'Void'
                  : `Unpaid — £${booking.invoice.total.toFixed(2)}`}
              </Pill>
            )}
          </div>

          {booking.invoice_flagged && (
            <div style={{ padding: '10px 12px', background: 'var(--tint-amber)', border: '1px solid var(--tint-amber-text)', borderRadius: 8, fontSize: 12, color: 'var(--tint-amber-text)' }}>
              This booking was edited after the invoice was sent. Check the invoice is still accurate and resend if needed.
            </div>
          )}
        </div>

        {/* Actions */}
        {!isCancelled && (
          <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            {!booking.google_event_id && (
              <div>
                <button
                  onClick={handleSyncCalendar}
                  disabled={syncing}
                  style={{
                    width: '100%', padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    fontFamily: 'var(--font-label)', letterSpacing: '0.06em', textTransform: 'uppercase',
                    cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1,
                    background: 'var(--tint-blue)', color: 'var(--tint-blue-text)',
                    border: '1px solid var(--tint-blue-text)',
                  }}
                >
                  {syncing ? 'Syncing…' : 'Add to Google Calendar'}
                </button>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
                  Only use this if the event is genuinely missing
                </p>
                {syncResult && (
                  <p style={{ fontSize: 12, textAlign: 'center', marginTop: 6, fontWeight: 600, color: 'var(--tint-green-text)' }}>
                    {syncResult}
                  </p>
                )}
              </div>
            )}

            {booking.invoice ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Btn href={`/invoices/${booking.invoice.id}`} variant="primary">
                  View Invoice #{booking.invoice.invoice_number}
                </Btn>
                <button
                  onClick={handleResendInvoice}
                  disabled={resending}
                  style={{
                    padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    fontFamily: 'var(--font-label)', letterSpacing: '0.06em', textTransform: 'uppercase',
                    cursor: resending ? 'not-allowed' : 'pointer', opacity: resending ? 0.6 : 1,
                    background: 'var(--tint-blue)', color: 'var(--tint-blue-text)',
                    border: '1px solid var(--tint-blue-text)',
                  }}
                >
                  {resending ? 'Sending…' : 'Resend Invoice'}
                </button>
                {resendResult && (
                  <p style={{ fontSize: 12, textAlign: 'center', fontWeight: 600, color: 'var(--tint-green-text)' }}>{resendResult}</p>
                )}
              </div>
            ) : (
              <Btn href={`/invoices/new?bookingId=${booking.id}`} variant="primary">
                Create Invoice
              </Btn>
            )}

            <button
              onClick={handleCancel}
              disabled={cancelling}
              style={{
                padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--font-label)', letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: cancelling ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.6 : 1,
                background: 'var(--tint-red)', color: 'var(--tint-red-text)',
                border: '1px solid var(--tint-red-text)',
              }}
            >
              {cancelling ? 'Cancelling…' : 'Cancel Booking'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
