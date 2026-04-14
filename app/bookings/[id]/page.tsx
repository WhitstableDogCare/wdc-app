'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  google_event_id: string | null
  dog: { id: number; name: string; photo_path: string | null } | null
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

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/bookings/${id}`).then(r => r.json()).then(data => {
      setBooking(data)
      setLoading(false)
      // If no event ID stored, quietly check if a matching event exists in Google Calendar
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
      setSyncResult('✓ Synced to Google Calendar')
    } else {
      setSyncResult(data.error ?? 'Sync failed')
    }
    setSyncing(false)
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this booking? This will also remove it from Google Calendar.')) return
    setCancelling(true)
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    router.push('/bookings')
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>
  if (!booking) return <div className="text-center py-16 text-gray-400">Booking not found.</div>

  const isBoarding = booking.booking_type === 'Boarding'
  const isCancelled = booking.status === 'Cancelled'
  const nights = isBoarding && booking.end_date ? nightsBetween(booking.start_date, booking.end_date) : null

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/bookings" className="text-gray-400 hover:text-gray-600 text-sm">← Bookings</Link>
        <Link href={`/bookings/${booking.id}/edit`}
          className="text-sm bg-[#2d6a4f] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#245a41] transition-colors">
          Edit
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            {booking.dog?.photo_path ? (
              <img src={booking.dog.photo_path} alt={booking.dog_name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl">🐾</div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{booking.dog_name}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isBoarding ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {booking.booking_type}
                </span>
                {isCancelled && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Cancelled</span>}
              </div>
              {booking.dog && (
                <Link href={`/dogs/${booking.dog.id}`} className="text-xs text-[#2d6a4f] hover:underline mt-0.5 inline-block">
                  View dog profile →
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {isBoarding ? 'Drop-off' : 'Date'}
              </p>
              <p className="text-sm text-gray-800">{formatDate(booking.start_date)}</p>
              {booking.drop_off_time && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2 mb-0.5">Drop-off</p>}
              {booking.drop_off_time && <p className="text-xs text-gray-500">{formatTime(booking.drop_off_time)}</p>}
            </div>
            {isBoarding && booking.end_date ? (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Pick-up</p>
                <p className="text-sm text-gray-800">{formatDate(booking.end_date)}</p>
                {booking.pick_up_time && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2 mb-0.5">Pick-up</p>}
                {booking.pick_up_time && <p className="text-xs text-gray-500">{formatTime(booking.pick_up_time)}</p>}
                {nights !== null && <p className="text-xs text-gray-500 mt-0.5">{nights} night{nights !== 1 ? 's' : ''}</p>}
              </div>
            ) : !isBoarding && booking.pick_up_time ? (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Pick-up</p>
                <p className="text-xs text-gray-500">{formatTime(booking.pick_up_time)}</p>
              </div>
            ) : null}
          </div>

          {booking.service_type && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Service</p>
              <p className="text-sm text-gray-800">{booking.service_type}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Rate</p>
            <p className="text-sm text-gray-800">{booking.rate_type}</p>
          </div>

          {booking.owner_name && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Owner</p>
              <p className="text-sm text-gray-800">{booking.owner_name}</p>
              {booking.owner_email && <p className="text-xs text-gray-500">{booking.owner_email}</p>}
            </div>
          )}

          {booking.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{booking.notes}</p>
            </div>
          )}

          <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-xs text-gray-400">
            {booking.google_event_id
              ? <span className="text-green-600">✓ Linked to Google Calendar</span>
              : <span className="text-gray-400">Not linked to Google Calendar</span>
            }
            {booking.confirmation_sent && <span>✓ Confirmation sent</span>}
          </div>
        </div>

        {/* Actions */}
        {!isCancelled && (
          <div className="flex flex-col gap-3 mt-6 pt-5 border-t border-gray-100">
            {!booking.google_event_id && (
              <div>
                <button onClick={handleSyncCalendar} disabled={syncing}
                  className="w-full py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-60">
                  {syncing ? 'Syncing...' : '📅 Add to Google Calendar'}
                </button>
                <p className="text-xs text-gray-400 mt-1 text-center">Only use this if the event is genuinely missing — it will create a new one</p>
                {syncResult && (
                  <p className={`text-xs mt-1.5 text-center font-medium ${syncResult.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                    {syncResult}
                  </p>
                )}
              </div>
            )}
            <button onClick={handleCancel} disabled={cancelling}
              className="flex-1 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60">
              {cancelling ? 'Cancelling...' : 'Cancel Booking'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
