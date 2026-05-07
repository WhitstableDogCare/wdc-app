'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageHead, Btn, Pill } from '../../components/ui'

interface Dog {
  id: number
  name: string
  breed: string | null
  owners: { name: string | null; email: string | null }[]
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-label)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
      {children}
    </label>
  )
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
        d.count >= 5 ? `Full — ${d.count} dogs already booked on these dates.` :
        d.count >= 4 ? `Nearly full — ${d.count}/5 dogs booked on these dates.` : null
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
    <div style={{ maxWidth: 560 }}>
      <PageHead title="New Booking">
        <Btn href="/bookings" variant="secondary">Cancel</Btn>
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
            <input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="For confirmation email" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Type */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
          <FieldLabel>Booking Type</FieldLabel>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['Boarding', 'Daycare'] as const).map(t => (
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
            <input type="checkbox" checked={isTrial} onChange={e => setIsTrial(e.target.checked)} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 13, color: 'var(--text)' }}>This is a trial booking</span>
            {isTrial && <Pill color="blue">{bookingType} Trial</Pill>}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 13, color: 'var(--text)' }}>Recurring weekly</span>
            {isRecurring && <Pill color="blue">Recurring</Pill>}
          </label>
        </div>

        {/* Dates */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
          {isRecurring ? (
            <div>
              <FieldLabel>Day of Week</FieldLabel>
              <select value={dayOfWeek} onChange={e => setDayOfWeek(parseInt(e.target.value))} style={{ width: '100%' }}>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
                <option value={0}>Sunday</option>
              </select>
              {startDate && (
                <p style={{ fontSize: 12, color: 'var(--cta-purple)', marginTop: 6, fontWeight: 600 }}>
                  First occurrence: {new Date(startDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <FieldLabel>{bookingType === 'Boarding' ? 'Drop-off Date' : 'Date'}</FieldLabel>
                <input type="date" value={startDate} min={today} onChange={e => {
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
          )}
        </div>

        {/* Times */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel>Drop-off Time</FieldLabel>
            <input type="time" step={900} value={dropOffTime} onChange={e => setDropOffTime(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <FieldLabel>Pick-up Time</FieldLabel>
            <input type="time" step={900} value={pickUpTime} onChange={e => setPickUpTime(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Warnings */}
        {capacityWarning && (
          <div style={{ background: 'var(--tint-gold)', border: '1px solid var(--gold)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--tint-gold-text)' }}>
            {capacityWarning}
          </div>
        )}
        {soloWarnings.length > 0 && (
          <div style={{ background: 'var(--tint-amber)', border: '1px solid var(--tint-amber-text)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--tint-amber-text)' }}>
            <p style={{ fontWeight: 600, margin: 0 }}>Solo dog conflict — {soloWarnings.map(w => w.dogName).join(', ')} {soloWarnings.length === 1 ? 'is' : 'are'} also booked on these dates.</p>
            <p style={{ margin: '4px 0 0', opacity: 0.8 }}>You can still proceed if you&apos;re sure this is correct.</p>
          </div>
        )}
        {conflictWarnings.map((w, i) => (
          <div key={i} style={{ background: 'var(--tint-red)', border: '1px solid var(--tint-red-text)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--tint-red-text)' }}>
            <p style={{ fontWeight: 600, margin: 0 }}>{w.dogName} is also booked on these dates and doesn&apos;t get along with {dogName || 'this dog'}.</p>
            {w.notes && <p style={{ margin: '4px 0 0', opacity: 0.8 }}>{w.notes}</p>}
          </div>
        ))}

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

        {ownerEmail && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ width: 16, height: 16 }} />
            Send confirmation email to owner
          </label>
        )}

        {error && (
          <div style={{ background: 'var(--tint-red)', border: '1px solid var(--tint-red-text)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--tint-red-text)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, paddingBottom: 32 }}>
          <Btn onClick={handleSubmit} disabled={saving} variant="primary">
            {saving ? 'Creating…' : 'Confirm Booking'}
          </Btn>
          <Btn href="/bookings" variant="secondary">Cancel</Btn>
        </div>
      </div>
    </div>
  )
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Loading…</div>}>
      <NewBookingInner />
    </Suspense>
  )
}
