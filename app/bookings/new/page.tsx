'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Dog {
  id: number
  name: string
  breed: string | null
  owners: { name: string | null; email: string | null }[]
}

function NewBookingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedDogId = searchParams.get('dogId')
  const [dogs, setDogs] = useState<Dog[]>([])
  const [selectedDogId, setSelectedDogId] = useState<number | ''>('')
  const [dogName, setDogName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [bookingType, setBookingType] = useState<'Boarding' | 'Daycare'>('Boarding')
  const [isTrial, setIsTrial] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dropOffTime, setDropOffTime] = useState('09:00')
  const [pickUpTime, setPickUpTime] = useState('17:00')
  const [notes, setNotes] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [sendEmail, setSendEmail] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null)
  const [conflictWarnings, setConflictWarnings] = useState<{ dogName: string; notes: string | null }[]>([])
  const [soloWarnings, setSoloWarnings] = useState<{ dogName: string }[]>([])

  function nextOccurrence(dow: number): string {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    const daysUntil = (dow - d.getDay() + 7) % 7
    d.setDate(d.getDate() + (daysUntil === 0 ? 7 : daysUntil))
    return d.toISOString().split('T')[0]
  }

  useEffect(() => {
    fetch('/api/dogs').then(r => r.json()).then((data: Dog[]) => {
      setDogs(data)
      if (preselectedDogId) {
        const id = parseInt(preselectedDogId)
        setSelectedDogId(id)
      }
    })
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
  }, [preselectedDogId])

  useEffect(() => {
    if (selectedDogId === '') return
    const dog = dogs.find(d => d.id === selectedDogId)
    if (!dog) return
    setDogName(dog.name)
    setOwnerName(dog.owners[0]?.name ?? '')
    setOwnerEmail(dog.owners[0]?.email ?? '')
  }, [selectedDogId, dogs])

  useEffect(() => {
    if (isRecurring) setStartDate(nextOccurrence(dayOfWeek))
  }, [isRecurring, dayOfWeek])

  useEffect(() => {
    if (!startDate) return
    const end = bookingType === 'Boarding' ? endDate : startDate
    if (!end) return
    fetch(`/api/bookings/capacity?start=${startDate}&end=${end}`)
      .then(r => r.json())
      .then(d => setCapacityWarning(
        d.count >= 5 ? `⚠️ Full — ${d.count} dogs already booked on these dates.` :
        d.count >= 4 ? `⚠️ Nearly full — ${d.count}/5 dogs booked on these dates.` : null
      ))
      .catch(() => setCapacityWarning(null))
  }, [startDate, endDate, bookingType])

  useEffect(() => {
    if (!selectedDogId || !startDate) { setConflictWarnings([]); setSoloWarnings([]); return }
    const end = bookingType === 'Boarding' ? endDate : startDate
    if (!end) { setConflictWarnings([]); setSoloWarnings([]); return }
    fetch(`/api/bookings/conflicts?dogId=${selectedDogId}&start=${startDate}&end=${end}`)
      .then(r => r.json())
      .then(setConflictWarnings)
      .catch(() => setConflictWarnings([]))
    fetch(`/api/bookings/solo-conflicts?dogId=${selectedDogId}&start=${startDate}&end=${end}`)
      .then(r => r.json())
      .then(setSoloWarnings)
      .catch(() => setSoloWarnings([]))
  }, [selectedDogId, startDate, endDate, bookingType])

  const handleSubmit = async () => {
    if (!dogName) { setError('Dog name is required.'); return }
    if (!isRecurring && !startDate) { setError('Start date is required.'); return }
    if (!isRecurring && bookingType === 'Boarding' && !endDate) { setError('Pick-up date is required for boarding.'); return }
    if (!isRecurring && bookingType === 'Boarding' && endDate <= startDate) { setError('Pick-up date must be after the drop-off date.'); return }
    if (!isRecurring && bookingType === 'Daycare' && dropOffTime && pickUpTime && pickUpTime <= dropOffTime) { setError('Pick-up time must be after the drop-off time.'); return }
    setSaving(true)
    setError(null)
    const effectiveStartDate = isRecurring ? nextOccurrence(dayOfWeek) : startDate
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dogId: selectedDogId || null,
        dogName, ownerName, ownerEmail,
        bookingType: isTrial ? `${bookingType} Trial` : bookingType,
        startDate: effectiveStartDate,
        endDate: isRecurring ? null : (bookingType === 'Boarding' ? endDate : startDate),
        dropOffTime, pickUpTime, notes,
        isRecurring,
        dayOfWeek: isRecurring ? dayOfWeek : null,
        sendEmail,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to create booking.'); setSaving(false); return }
    router.push(`/bookings/${data.id}`)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/bookings" className="text-gray-400 hover:text-gray-600 text-sm">← Bookings</Link>
        <h1 className="text-2xl font-bold text-gray-900">New Booking</h1>
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
              placeholder="For confirmation email"
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
            <input type="checkbox" checked={isTrial} onChange={e => setIsTrial(e.target.checked)}
              className="w-4 h-4 rounded accent-[#2d6a4f]" />
            <span className="text-sm text-gray-700 font-medium">This is a trial booking</span>
            {isTrial && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{bookingType} Trial</span>}
          </label>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
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
            {startDate && (
              <p className="text-xs text-[#2d6a4f] mt-1.5 font-medium">
                First occurrence: {new Date(startDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                {bookingType === 'Boarding' ? 'Drop-off Date' : 'Date'}
              </label>
              <input type="date" value={startDate} min={today} onChange={e => {
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

        {capacityWarning && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">{capacityWarning}</div>
        )}
        {soloWarnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
            <p className="font-medium">⚠️ Solo dog conflict — {soloWarnings.map(w => w.dogName).join(', ')} {soloWarnings.length === 1 ? 'is' : 'are'} also booked on these dates. Solo dogs cannot share dates with other Solo dogs.</p>
            <p className="mt-0.5 text-amber-600">You can still proceed if you&apos;re sure this is correct.</p>
          </div>
        )}
        {conflictWarnings.map((w, i) => (
          <div key={i} className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
            <p className="font-medium">⚠️ {w.dogName} is also booked on these dates and doesn&apos;t get along with {dogName || 'this dog'}.</p>
            {w.notes && <p className="mt-0.5 text-red-600">{w.notes}</p>}
          </div>
        ))}

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Any special instructions for this booking..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none" />
        </div>

        {ownerEmail && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)}
              className="w-4 h-4 rounded accent-[#2d6a4f]" />
            <span className="text-sm text-gray-700">Send confirmation email to owner</span>
          </label>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-[#2d6a4f] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#245a41] transition-colors disabled:opacity-60">
            {saving ? 'Creating...' : 'Confirm Booking'}
          </button>
          <Link href="/bookings" className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
        </div>

      </div>
    </div>
  )
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-500">Loading...</div>}>
      <NewBookingInner />
    </Suspense>
  )
}
