'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
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
  is_recurring: boolean
  day_of_week: number | null
  dog: { id: number; name: string; photo_path: string | null; is_solo: boolean } | null
  // virtual field used when expanding recurring occurrences
  _virtual_date?: string
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

function getNextOccurrences(dayOfWeek: number, count = 4): string[] {
  const dates: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(today)
  const daysUntil = (dayOfWeek - d.getDay() + 7) % 7
  d.setDate(d.getDate() + daysUntil)
  for (let i = 0; i < count; i++) {
    dates.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 7)
  }
  return dates
}

function BookingCard({ booking }: { booking: Booking }) {
  const isBoarding = booking.booking_type === 'Boarding'
  const displayDate = booking._virtual_date ?? booking.start_date
  const isPast = new Date(displayDate + 'T23:59:00') < new Date()
  const isCancelled = booking.status === 'Cancelled'
  const nights = isBoarding && booking.end_date ? nightsBetween(booking.start_date, booking.end_date) : null

  return (
    <Link href={`/bookings/${booking.id}`}
      className={`block bg-white rounded-xl border p-4 hover:shadow-sm transition-all ${isCancelled ? 'opacity-50 border-gray-200' : isPast ? 'border-gray-200' : 'border-[#2d6a4f]/20'}`}>
      <div className="flex items-center gap-3">
        {booking.dog?.photo_path ? (
          <img src={booking.dog.photo_path} alt={booking.dog_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 text-lg">🐾</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-800">{booking.dog_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isBoarding ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {booking.booking_type}
            </span>
            {booking.is_recurring && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">🔁 Recurring</span>
            )}
            {booking.dog?.is_solo && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">🐶 Solo</span>
            )}
            {booking.rate_type === 'Peak' && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Peak</span>}
            {isCancelled && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Cancelled</span>}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {booking.is_recurring && booking.day_of_week != null && !booking._virtual_date
              ? `Every ${DAY_NAMES[booking.day_of_week]}`
              : formatDate(displayDate)}
            {booking._virtual_date && booking.is_recurring ? ` (recurring)` : ''}
            {isBoarding && booking.end_date ? ` → ${formatDate(booking.end_date)}${nights ? ` (${nights} night${nights !== 1 ? 's' : ''})` : ''}` : ''}
            {booking.service_type ? ` · ${booking.service_type}` : ''}
          </p>
          {booking.owner_name && <p className="text-xs text-gray-400 mt-0.5">{booking.owner_name}</p>}
        </div>
      </div>
    </Link>
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

  // Build the display list based on filter
  let displayList: Booking[] = []

  if (filter === 'upcoming') {
    // Non-recurring upcoming
    const nonRecurring = bookings.filter(b => {
      if (b.is_recurring) return false
      const end = new Date((b.end_date ?? b.start_date) + 'T23:59:00')
      return end >= now && b.status !== 'Cancelled'
    })

    // Recurring active — expand to next 4 occurrences
    const recurringExpanded: Booking[] = []
    for (const b of bookings) {
      if (!b.is_recurring || b.status === 'Cancelled' || b.day_of_week == null) continue
      const occurrences = getNextOccurrences(b.day_of_week, 4)
      for (const date of occurrences) {
        recurringExpanded.push({ ...b, _virtual_date: date })
      }
    }

    displayList = [...nonRecurring, ...recurringExpanded].sort((a, b) => {
      const da = a._virtual_date ?? a.start_date
      const db = b._virtual_date ?? b.start_date
      return da.localeCompare(db)
    })
  } else if (filter === 'past') {
    // Non-recurring past or cancelled
    displayList = bookings.filter(b => {
      if (b.is_recurring) {
        return b.status === 'Cancelled'
      }
      const end = new Date((b.end_date ?? b.start_date) + 'T23:59:00')
      return end < now || b.status === 'Cancelled'
    })
  } else {
    // All: non-recurring show all; recurring active as single entry; recurring cancelled as single entry
    displayList = bookings
  }

  // Group by month
  const groups: Record<string, Booking[]> = {}
  for (const b of displayList) {
    const dateKey = b._virtual_date ?? b.start_date
    const key = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  }

  return (
    <>
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        {(['upcoming', 'past', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${filter === f ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : displayList.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium">{filter === 'upcoming' ? 'No upcoming bookings' : 'No bookings found'}</p>
          <Link href="/bookings/new" className="text-[#2d6a4f] text-sm mt-2 inline-block hover:underline">Create one →</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([month, group]) => (
            <div key={month}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{month}</p>
              <div className="space-y-2">
                {group.map((b, i) => <BookingCard key={b._virtual_date ? `${b.id}-${b._virtual_date}` : `${b.id}-${i}`} booking={b} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function groupUnavailableByMonth(periods: UnavailablePeriod[]) {
  const groups: Record<string, UnavailablePeriod[]> = {}
  for (const p of periods) {
    const key = new Date(p.start_date + 'T12:00:00')
      .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
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
    setError(null)
    setWarning(null)
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
    setShowForm(false)
    setStartDate('')
    setEndDate('')
    setReason('Holiday')
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
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Dates when you're not taking bookings.</p>
        <button onClick={() => { setShowForm(v => !v); setError(null); setWarning(null) }}
          className="text-sm px-3 py-1.5 rounded-lg font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {warning && (
        <div className="mb-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          ⚠️ {warning}
        </div>
      )}

      {showForm && (
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                min={today}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                min={startDate || today}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
              {UNAVAILABLE_REASONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={handleAdd} disabled={submitting}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60">
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-gray-400">Loading...</p>}

      {!loading && upcoming.length === 0 && !showForm && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🗓️</p>
          <p className="font-medium">No upcoming unavailable periods</p>
        </div>
      )}

      {!loading && upcoming.length > 0 && (
        <div className="space-y-4">
          {Object.entries(groups).map(([month, monthPeriods]) => (
            <div key={month}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{month}</p>
              <div className="space-y-2">
                {monthPeriods.map(p => (
                  <div key={p.id}
                    className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[36px]">
                        <p className="text-xs text-gray-400 leading-none">
                          {new Date(p.start_date + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short' })}
                        </p>
                        <p className="text-xl font-bold text-gray-500 leading-tight">
                          {new Date(p.start_date + 'T12:00:00').getDate()}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700 text-sm">{p.reason}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {p.start_date === p.end_date
                            ? fmtDate(p.start_date)
                            : <>{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</>
                          }
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 flex-shrink-0">
                      {deletingId === p.id ? '...' : 'Delete'}
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

  const InvoiceTable = ({ rows }: { rows: Invoice[] }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice #</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dog</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(inv => (
            <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <Link href={`/invoices/${inv.id}`} className="font-mono font-semibold text-[#2d6a4f] hover:underline">
                  #{inv.invoice_number}
                </Link>
              </td>
              <td className="px-4 py-3 font-medium text-gray-800">{inv.dog_name || '—'}</td>
              <td className="px-4 py-3 text-gray-600">{inv.client_name || '—'}</td>
              <td className="px-4 py-3 text-gray-600">{fmtInvoiceDate(inv.due_date)}</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-900">£{inv.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const unpaid = invoices.filter(inv => inv.status !== 'Paid' && inv.status !== 'Void')
  const paid   = invoices.filter(inv => inv.status === 'Paid').sort((a, b) => (b.due_date ?? '').localeCompare(a.due_date ?? ''))

  return (
    <>
      {/* Tab toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {!loading && invoices.length > 0 && (
            <span><span className="text-amber-600 font-semibold">{unpaid.length}</span> unpaid · <span className="text-green-600 font-semibold">{paid.length}</span> paid</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/invoices/bulk"
            className="border border-[#2d6a4f] text-[#2d6a4f] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-50 transition-colors"
          >
            📤 Send Invoices
          </Link>
          <Link
            href="/invoices/new"
            className="bg-[#2d6a4f] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#245a41] transition-colors"
          >
            + New Invoice
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🧾</p>
          <p className="font-medium">No invoices yet</p>
          <p className="text-sm mt-1">Create your first invoice to get started</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Unpaid <span className="text-amber-500">({unpaid.length})</span>
            </h2>
            {unpaid.length === 0
              ? <p className="text-sm text-gray-400 py-4 text-center bg-white rounded-2xl border border-gray-100">No unpaid invoices 🎉</p>
              : <InvoiceTable rows={unpaid} />
            }
          </div>
          {paid.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Paid <span className="text-green-600">({paid.length})</span>
              </h2>
              <InvoiceTable rows={paid} />
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default function BookingsInvoicesPage() {
  const [activeTab, setActiveTab] = useState<'bookings' | 'invoices' | 'unavailable'>('bookings')

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings & Invoices</h1>
        <Link href="/bookings/new"
          className="bg-[#2d6a4f] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#245a41] transition-colors">
          + New Booking
        </Link>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 max-w-sm">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'bookings' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Bookings
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'invoices' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Invoices
        </button>
        <button
          onClick={() => setActiveTab('unavailable')}
          className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'unavailable' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Unavailable
        </button>
      </div>

      {activeTab === 'bookings' && <BookingsTab />}
      {activeTab === 'invoices' && <InvoicesTab />}
      {activeTab === 'unavailable' && <UnavailableTab />}
    </div>
  )
}
