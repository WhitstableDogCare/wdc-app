'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Dog {
  id: number
  name: string
  breed: string | null
  owners: { name: string | null; email: string | null }[]
}

interface Booking {
  id: number
  dog_id: number | null
  dog_name: string
  owner_name: string | null
  owner_email: string | null
  booking_type: string
  start_date: string
  end_date: string | null
  drop_off_time: string | null
  pick_up_time: string | null
  notes: string | null
  status: string
  is_recurring: boolean
  day_of_week: number | null
}

export default function EditBookingPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [dogs, setDogs] = useState<Dog[]>([])
  const [selectedDogId, setSelectedDogId] = useState<number | ''>('')
  const [dogName, setDogName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [bookingType, setBookingType] = useState<'Boarding' | 'Daycare'>('Boarding')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dropOffTime, setDropOffTime] = useState('')
  const [pickUpTime, setPickUpTime] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('Confirmed')
  const [isRecurring, setIsRecurring] = useState(false)
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [soloWarnings, setSoloWarnings] = useState<{ dogName: string }[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/dogs').then(r => r.json()),
      fetch(`/api/bookings/${id}`).then(r => r.json()),
    ]).then(([dogsData, booking]: [Dog[], Booking]) => {
      setDogs(dogsData)
      setDogName(booking.dog_name)
      setOwnerName(booking.owner_name ?? '')
      setOwnerEmail(booking.owner_email ?? '')
      setBookingType(booking.booking_type as 'Boarding' | 'Daycare')
      setStartDate(booking.start_date)
      setEndDate(booking.end_date ?? booking.start_date)
      setDropOffTime(booking.drop_off_time ?? '')
      setPickUpTime(booking.pick_up_time ?? '')
      setNotes(booking.notes ?? '')
      setStatus(booking.status)
      setIsRecurring(booking.is_recurring ?? false)
      setDayOfWeek(booking.day_of_week ?? 1)
      if (booking.dog_id) setSelectedDogId(booking.dog_id)
      setLoading(false)
    })
  }, [id])

  // When dog is changed from dropdown, update owner fields
  useEffect(() => {
    if (selectedDogId === '') return
    const dog = dogs.find(d => d.id === selectedDogId)
    if (!dog) return
    setDogName(dog.name)
    setOwnerName(dog.owners[0]?.name ?? '')
    setOwnerEmail(dog.owners[0]?.email ?? '')
  }, [selectedDogId, dogs])

  useEffect(() => {
    if (!selectedDogId || !startDate) { setSoloWarnings([]); return }
    const end = bookingType === 'Boarding' ? endDate : startDate
    fetch(`/api/bookings/solo-conflicts?dogId=${selectedDogId}&start=${startDate}&end=${end}&excludeBookingId=${id}`)
      .then(r => r.json())
      .then(setSoloWarnings)
      .catch(() => setSoloWarnings([]))
  }, [selectedDogId, startDate, endDate, bookingType, id])

  const handleSubmit = async () => {
    if (!dogName) { setError('Dog name is required.'); return }
    if (!isRecurring && !startDate) { setError('Start date is required.'); return }
    if (!isRecurring && bookingType === 'Boarding' && endDate <= startDate) { setError('Pick-up date must be after the drop-off date.'); return }
    if (!isRecurring && bookingType === 'Daycare' && dropOffTime && pickUpTime && pickUpTime <= dropOffTime) { setError('Pick-up time must be after the drop-off time.'); return }
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dogName, ownerName, ownerEmail, bookingType,
        startDate,
        endDate: isRecurring ? null : (bookingType === 'Boarding' ? endDate : startDate),
        dropOffTime, pickUpTime, notes, status,
        isRecurring,
        dayOfWeek: isRecurring ? dayOfWeek : null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to update booking.'); setSaving(false); return }
    router.push(`/bookings/${id}`)
  }

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/bookings/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">← Booking</Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Booking</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">

        {/* Dog */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Dog</label>
          <select value={selectedDogId} onChange={e => setSelectedDogId(e.target.value ? parseInt(e.target.value) : '')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white mb-2">
            <option value="">— Select a dog —</option>
            {dogs.sort((a, b) => a.name.localeCompare(b.name)).map(d => (
              <option key={d.id} value={d.id}>{d.name}{d.breed ? ` (${d.breed})` : ''}</option>
            ))}
          </select>
          <input type="text" value={dogName} onChange={e => setDogName(e.target.value)}
            placeholder="Or type dog name manually"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
        </div>

        {/* Owner */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Owner Name</label>
            <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Owner Email</label>
            <input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Booking Type</label>
          <div className="flex gap-2">
            {(['Boarding', 'Daycare'] as const).map(t => (
              <button key={t} onClick={() => setBookingType(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${bookingType === t ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#2d6a4f]'}`}>
                {t}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded accent-[#2d6a4f]" />
            <span className="text-sm text-gray-700 font-medium">Recurring weekly</span>
            {isRecurring && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">🔁 Recurring</span>}
          </label>
        </div>

        {/* Dates */}
        {isRecurring ? (
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Day of Week</label>
            <select value={dayOfWeek} onChange={e => setDayOfWeek(parseInt(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white">
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
              <option value={0}>Sunday</option>
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                {bookingType === 'Boarding' ? 'Drop-off Date' : 'Date'}
              </label>
              <input type="date" value={startDate} onChange={e => {
                const newStart = e.target.value
                setStartDate(newStart)
                if (bookingType === 'Boarding' && newStart && endDate <= newStart) {
                  const d = new Date(newStart + 'T12:00:00')
                  d.setDate(d.getDate() + 1)
                  setEndDate(d.toISOString().split('T')[0])
                }
              }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
            </div>
            {bookingType === 'Boarding' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Pick-up Date</label>
                <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
              </div>
            )}
          </div>
        )}

        {/* Times */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Drop-off Time</label>
            <input type="time" step={900} value={dropOffTime} onChange={e => setDropOffTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Pick-up Time</label>
            <input type="time" step={900} value={pickUpTime} onChange={e => setPickUpTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white">
            <option value="Confirmed">Confirmed</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Any special instructions for this booking..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none" />
        </div>

        {soloWarnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
            <p className="font-medium">⚠️ Solo dog conflict — {soloWarnings.map(w => w.dogName).join(', ')} {soloWarnings.length === 1 ? 'is' : 'are'} also booked on these dates. Solo dogs cannot share dates with other Solo dogs.</p>
            <p className="mt-0.5 text-amber-600">You can still proceed if you&apos;re sure this is correct.</p>
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-[#2d6a4f] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#245a41] transition-colors disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link href={`/bookings/${id}`} className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
