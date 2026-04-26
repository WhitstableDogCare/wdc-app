'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
        // Pre-select all bookings that have an email
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
    // Remove sent bookings from the list
    const sentIds = new Set((data.results ?? []).filter((r: SendResult) => r.status === 'sent').map((r: SendResult) => r.bookingId))
    setBookings(prev => prev.filter(b => !sentIds.has(b.id)))
    setSelected(new Set())
    setSending(false)
  }

  const eligibleCount = bookings.filter(b => b.has_email).length

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/invoices" className="text-gray-400 hover:text-gray-600 text-sm">← Invoices</Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2d2d4e]">Send Invoices</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upcoming confirmed bookings without an invoice. Select the ones you want to invoice and send all at once.
        </p>
      </div>

      {/* Results banner */}
      {results && (
        <div className="mb-6 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="font-semibold text-gray-800 mb-2">Done — here's what happened:</p>
          <div className="space-y-1">
            {results.map(r => (
              <div key={r.bookingId} className="flex items-center gap-2 text-sm">
                {r.status === 'sent'
                  ? <span className="text-green-600">✓ {r.dogName} — invoice sent</span>
                  : <span className="text-amber-600">⚠ {r.dogName} — skipped ({r.reason})</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-2xl mb-2">✓</p>
          <p className="font-semibold text-gray-700">All upcoming bookings have been invoiced</p>
          <p className="text-sm text-gray-400 mt-1">Nothing left to do here.</p>
        </div>
      ) : (
        <>
          {/* Select all + send button */}
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={eligibleCount > 0 && bookings.filter(b => b.has_email).every(b => selected.has(b.id))}
                onChange={toggleAll}
                className="rounded"
              />
              Select all ({eligibleCount} with email)
            </label>
            <button
              onClick={handleSend}
              disabled={sending || selected.size === 0}
              className="bg-[#2d6a4f] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#245a41] transition-colors disabled:opacity-50"
            >
              {sending ? 'Sending...' : `Send ${selected.size > 0 ? selected.size : ''} Invoice${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>

          {/* Booking list */}
          <div className="space-y-2">
            {bookings.map(b => (
              <div key={b.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-3 ${!b.has_email ? 'opacity-60' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected.has(b.id)}
                  onChange={() => toggleOne(b.id)}
                  disabled={!b.has_email}
                  className="mt-1 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{b.dog_name}</span>
                    {b.dog_breed && <span className="text-xs text-gray-400">{b.dog_breed}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.booking_type.startsWith('Boarding') ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {b.booking_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {formatDate(b.start_date)}{b.end_date ? ` → ${formatDate(b.end_date)}` : ''}
                  </p>
                  {b.owner_name && <p className="text-xs text-gray-400 mt-0.5">{b.owner_name}</p>}
                  {b.owner_email
                    ? <p className="text-xs text-gray-400">{b.owner_email}</p>
                    : <p className="text-xs text-red-400 font-medium">⚠ No email — cannot invoice</p>
                  }
                </div>
                <Link href={`/bookings/${b.id}`} className="text-xs text-[#2d6a4f] hover:underline whitespace-nowrap">
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
