'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { PageHead, Btn } from '../../../components/ui'
import TimeSelect from '../../../components/TimeSelect'

interface Dog {
  id: number
  name: string
  breed: string | null
  owners: { name: string | null; email: string | null }[]
}

interface UnavailablePeriod {
  id: number
  start_date: string
  end_date: string
  reason: string
  note?: string | null
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
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-label)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
      {children}
    </label>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function formatDateReadable(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${days[d.getDay()]} ${ordinal(d.getDate())} ${months[d.getMonth()]}`
}

function formatTimeReadable(timeStr: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const hour = h % 12 || 12
  const suffix = h < 12 ? 'am' : 'pm'
  return m === 0 ? `${hour}${suffix}` : `${hour}:${m.toString().padStart(2, '0')}${suffix}`
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [soloWarnings, setSoloWarnings] = useState<{ dogName: string }[]>([])
  const [unavailablePeriods, setUnavailablePeriods] = useState<UnavailablePeriod[]>([])
  const [unavailableWarning, setUnavailableWarning] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/unavailable-periods').then(r => r.json()).then(setUnavailablePeriods)
  }, [])

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
      if (booking.dog_id) setSelectedDogId(booking.dog_id)
      setLoading(false)
    })
  }, [id])

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

  useEffect(() => {
    if (!startDate) { setUnavailableWarning(null); return }
    const end = bookingType === 'Boarding' ? endDate : startDate
    const hit = unavailablePeriods.find(p => startDate <= p.end_date && end >= p.start_date)
    setUnavailableWarning(hit ? `These dates overlap with an unavailable period (${hit.reason === 'Other' && hit.note ? `Other: ${hit.note}` : hit.reason}).` : null)
  }, [startDate, endDate, bookingType, unavailablePeriods])

  const handleSubmit = async () => {
    if (!dogName) { setError('Dog name is required.'); return }
    if (!startDate) { setError('Start date is required.'); return }
    if (bookingType === 'Boarding' && endDate <= startDate) { setError('Pick-up date must be after the drop-off date.'); return }
    if (bookingType === 'Daycare' && dropOffTime && pickUpTime && pickUpTime <= dropOffTime) { setError('Pick-up time must be after the drop-off time.'); return }
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dogName, ownerName, ownerEmail, bookingType,
        startDate,
        endDate: bookingType === 'Boarding' ? endDate : startDate,
        dropOffTime, pickUpTime, notes, status,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to update booking.'); setSaving(false); return }
    router.push(`/bookings/${id}`)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Loading…</div>
  )

  return (
    <div style={{ maxWidth: 560 }}>
      <PageHead title="Edit Booking">
        <Btn onClick={() => router.back()} variant="secondary">Cancel</Btn>
      </PageHead>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Dog */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
          <FieldLabel>Dog</FieldLabel>
          <select
            value={selectedDogId}
            onChange={e => setSelectedDogId(e.target.value ? parseInt(e.target.value) : '')}
            style={{ width: '100%', marginBottom: 8 }}
          >
            <option value="">— Select a dog —</option>
            {dogs.sort((a, b) => a.name.localeCompare(b.name)).map(d => (
              <option key={d.id} value={d.id}>{d.name}{d.breed ? ` (${d.breed})` : ''}</option>
            ))}
          </select>
          <input
            type="text"
            value={dogName}
            onChange={e => setDogName(e.target.value)}
            placeholder="Or type dog name manually"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* Owner */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel>Owner Name</FieldLabel>
            <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <FieldLabel>Owner Email</FieldLabel>
            <input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Type */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
          <FieldLabel>Booking Type</FieldLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['Daycare', 'Boarding'] as const).map(t => (
              <button key={t} onClick={() => setBookingType(t)} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-label)', letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 150ms',
                background: bookingType === t ? 'var(--cta-purple)' : 'var(--surface-3)',
                color: bookingType === t ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${bookingType === t ? 'var(--cta-purple)' : 'var(--border)'}`,
              }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel>{bookingType === 'Boarding' ? 'Drop-off Date' : 'Date'}</FieldLabel>
              <input type="date" value={startDate} onChange={e => {
                const newStart = e.target.value
                setStartDate(newStart)
                if (bookingType === 'Boarding' && newStart && endDate <= newStart) {
                  const d = new Date(newStart + 'T12:00:00')
                  d.setDate(d.getDate() + 1)
                  setEndDate(d.toISOString().split('T')[0])
                }
              }} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            {bookingType === 'Boarding' && (
              <div>
                <FieldLabel>Pick-up Date</FieldLabel>
                <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            )}
          </div>
        </div>

        {/* Times */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel>Drop-off Time</FieldLabel>
            <TimeSelect value={dropOffTime} onChange={setDropOffTime} minHour={7} maxHour={21} />
          </div>
          <div>
            <FieldLabel>Pick-up Time</FieldLabel>
            <TimeSelect value={pickUpTime} onChange={setPickUpTime} minHour={7} maxHour={21} />
          </div>
        </div>

        {startDate && dropOffTime && pickUpTime && (
          <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text)' }}>
            {bookingType === 'Daycare'
              ? `${formatDateReadable(startDate)}, ${formatTimeReadable(dropOffTime)} to ${formatTimeReadable(pickUpTime)}`
              : `${formatDateReadable(startDate)} ${formatTimeReadable(dropOffTime)} to ${formatDateReadable(endDate || startDate)} ${formatTimeReadable(pickUpTime)}`
            }
          </div>
        )}

        {/* Status */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
          <FieldLabel>Status</FieldLabel>
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%' }}>
            <option value="Confirmed">Confirmed</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Notes */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
          <FieldLabel>Notes</FieldLabel>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Any special instructions for this booking…"
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>

        {unavailableWarning && (
          <div style={{ background: 'var(--tint-red)', border: '1px solid var(--tint-red-text)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--tint-red-text)' }}>
            <p style={{ fontWeight: 600, margin: 0 }}>{unavailableWarning}</p>
            <p style={{ margin: '4px 0 0', opacity: 0.8 }}>You can still save this booking if you&apos;re sure it&apos;s correct.</p>
          </div>
        )}
        {soloWarnings.length > 0 && (
          <div style={{ background: 'var(--tint-amber)', border: '1px solid var(--tint-amber-text)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--tint-amber-text)' }}>
            <p style={{ fontWeight: 600, margin: 0 }}>Solo dog conflict — {soloWarnings.map(w => w.dogName).join(', ')} {soloWarnings.length === 1 ? 'is' : 'are'} also booked on these dates.</p>
            <p style={{ margin: '4px 0 0', opacity: 0.8 }}>You can still proceed if you&apos;re sure this is correct.</p>
          </div>
        )}
        {error && (
          <div style={{ background: 'var(--tint-red)', border: '1px solid var(--tint-red-text)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--tint-red-text)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, paddingBottom: 32 }}>
          <Btn onClick={handleSubmit} disabled={saving} variant="primary">
            {saving ? 'Saving…' : 'Save Changes'}
          </Btn>
          <Btn onClick={() => router.back()} variant="secondary">Cancel</Btn>
        </div>
      </div>
    </div>
  )
}
