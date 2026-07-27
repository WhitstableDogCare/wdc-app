'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHead, Btn, Pill } from '../../components/ui'
import TimeSelect from '../../components/TimeSelect'

interface Dog {
  id: number
  name: string
  breed: string | null
  owners: { name: string | null; email: string | null }[]
}

interface MultiDay {
  date: string
  dropOffTime: string
  pickUpTime: string
}

interface UnavailablePeriod {
  id: number
  start_date: string
  end_date: string
  reason: string
  note?: string | null
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-label)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
      {children}
    </label>
  )
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function datesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  let cur = start
  while (cur <= end) {
    dates.push(cur)
    cur = addDays(cur, 1)
  }
  return dates
}

function formatDayLabel(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
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

function NewBookingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedDogId = searchParams.get('dogId')
  const [dogs, setDogs] = useState<Dog[]>([])
  const [selectedDogId, setSelectedDogId] = useState<number | ''>('')
  const [dogName, setDogName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [bookingType, setBookingType] = useState<'Boarding' | 'Daycare'>('Daycare')
  const [isTrial, setIsTrial] = useState(false)
  const [isMultiDay, setIsMultiDay] = useState(false)

  // Single-day state
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dropOffTime, setDropOffTime] = useState('09:00')
  const [pickUpTime, setPickUpTime] = useState('17:00')

  // Multi-day state
  const [multiStart, setMultiStart] = useState('')
  const [multiEnd, setMultiEnd] = useState('')
  const [multiDays, setMultiDays] = useState<MultiDay[]>([])

  const [notes, setNotes] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null)
  const [conflictWarnings, setConflictWarnings] = useState<{ dogName: string; notes: string | null }[]>([])
  const [soloWarnings, setSoloWarnings] = useState<{ dogName: string }[]>([])
  const [unavailablePeriods, setUnavailablePeriods] = useState<UnavailablePeriod[]>([])
  const [unavailableWarning, setUnavailableWarning] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dogs').then(r => r.json()).then((data: Dog[]) => {
      setDogs(data)
      if (preselectedDogId) setSelectedDogId(parseInt(preselectedDogId))
    })
    fetch('/api/unavailable-periods').then(r => r.json()).then(setUnavailablePeriods)
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
    setMultiStart(today)
    setMultiEnd(today)
  }, [preselectedDogId])

  useEffect(() => {
    if (selectedDogId === '') return
    const dog = dogs.find(d => d.id === selectedDogId)
    if (!dog) return
    setDogName(dog.name)
    setOwnerName(dog.owners[0]?.name ?? '')
    setOwnerEmail(dog.owners[0]?.email ?? '')
  }, [selectedDogId, dogs])

  // Rebuild multiDays when range or default times change, preserving existing per-day overrides
  const rebuildMultiDays = useCallback((start: string, end: string, defaultDrop: string, defaultPick: string, existing: MultiDay[]) => {
    if (!start || !end || end < start) return
    const existingMap = Object.fromEntries(existing.map(d => [d.date, d]))
    const dates = datesInRange(start, end)
    setMultiDays(dates.map(date => existingMap[date] ?? { date, dropOffTime: defaultDrop, pickUpTime: defaultPick }))
  }, [])

  useEffect(() => {
    if (!isMultiDay || bookingType !== 'Daycare') return
    rebuildMultiDays(multiStart, multiEnd, dropOffTime, pickUpTime, multiDays)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiStart, multiEnd, isMultiDay, bookingType])

  // Unavailable period warning
  useEffect(() => {
    if (isMultiDay) { setUnavailableWarning(null); return }
    if (!startDate) { setUnavailableWarning(null); return }
    const end = bookingType === 'Boarding' ? endDate : startDate
    if (!end) { setUnavailableWarning(null); return }
    const hit = unavailablePeriods.find(p => startDate <= p.end_date && end >= p.start_date)
    setUnavailableWarning(hit ? `These dates overlap with an unavailable period (${hit.reason === 'Other' && hit.note ? `Other: ${hit.note}` : hit.reason}).` : null)
  }, [startDate, endDate, bookingType, isMultiDay, unavailablePeriods])

  // Capacity warning (single-day mode only)
  useEffect(() => {
    if (isMultiDay) return
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
  }, [startDate, endDate, bookingType, isMultiDay])

  useEffect(() => {
    if (!selectedDogId || !startDate || isMultiDay) { setConflictWarnings([]); setSoloWarnings([]); return }
    const end = bookingType === 'Boarding' ? endDate : startDate
    if (!end) { setConflictWarnings([]); setSoloWarnings([]); return }
    fetch(`/api/bookings/conflicts?dogId=${selectedDogId}&start=${startDate}&end=${end}`)
      .then(r => r.json()).then(setConflictWarnings).catch(() => setConflictWarnings([]))
    fetch(`/api/bookings/solo-conflicts?dogId=${selectedDogId}&start=${startDate}&end=${end}`)
      .then(r => r.json()).then(setSoloWarnings).catch(() => setSoloWarnings([]))
  }, [selectedDogId, startDate, endDate, bookingType, isMultiDay])

  const handleSubmitSingle = async () => {
    if (!dogName) { setError('Dog name is required.'); return }
    if (!startDate) { setError('Start date is required.'); return }
    if (bookingType === 'Boarding' && !endDate) { setError('Pick-up date is required for boarding.'); return }
    if (bookingType === 'Boarding' && endDate <= startDate) { setError('Pick-up date must be after the drop-off date.'); return }
    if (bookingType === 'Daycare' && dropOffTime && pickUpTime && pickUpTime <= dropOffTime) { setError('Pick-up time must be after the drop-off time.'); return }
    setSaving(true); setError(null)
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dogId: selectedDogId || null,
        dogName, ownerName, ownerEmail,
        bookingType: isTrial ? `${bookingType} Trial` : bookingType,
        startDate,
        endDate: bookingType === 'Boarding' ? endDate : startDate,
        dropOffTime, pickUpTime, notes, sendEmail,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to create booking.'); setSaving(false); return }
    router.push(`/bookings/${data.id}`)
  }

  const handleSubmitGroup = async () => {
    if (!dogName) { setError('Dog name is required.'); return }
    if (multiDays.length < 2) { setError('Select at least 2 days for a group booking.'); return }
    for (const d of multiDays) {
      if (d.dropOffTime && d.pickUpTime && d.pickUpTime <= d.dropOffTime) {
        setError(`Pick-up time must be after drop-off on ${formatDayLabel(d.date)}.`); return
      }
    }
    setSaving(true); setError(null)
    const res = await fetch('/api/bookings/group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dogId: selectedDogId || null,
        dogName, ownerName, ownerEmail,
        days: multiDays,
        notes, sendEmail,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to create bookings.'); setSaving(false); return }
    router.push('/bookings')
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{ maxWidth: 560 }}>
      <PageHead title="New Booking">
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
            <input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="For confirmation email" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Type */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
          <FieldLabel>Booking Type</FieldLabel>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['Daycare', 'Boarding'] as const).map(t => (
              <button key={t} onClick={() => { setBookingType(t); if (t !== 'Daycare') setIsMultiDay(false) }} style={{
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={isTrial} onChange={e => setIsTrial(e.target.checked)} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 13, color: 'var(--text)' }}>This is a trial booking</span>
            {isTrial && <Pill color="blue">{bookingType} Trial</Pill>}
          </label>
          {bookingType === 'Daycare' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 10 }}>
              <input type="checkbox" checked={isMultiDay} onChange={e => {
                setIsMultiDay(e.target.checked)
                if (e.target.checked) rebuildMultiDays(multiStart, multiEnd, dropOffTime, pickUpTime, multiDays)
              }} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13, color: 'var(--text)' }}>Multiple days (group booking)</span>
            </label>
          )}
        </div>

        {/* Single-day dates + times */}
        {!isMultiDay && (
          <>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
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
            </div>

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
          </>
        )}

        {/* Multi-day mode */}
        {isMultiDay && (
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <FieldLabel>From</FieldLabel>
                <input type="date" value={multiStart} min={today} onChange={e => {
                  const newStart = e.target.value
                  setMultiStart(newStart)
                  if (multiEnd < newStart) setMultiEnd(newStart)
                }} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <FieldLabel>To</FieldLabel>
                <input type="date" value={multiEnd} min={multiStart} onChange={e => setMultiEnd(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>

            {multiDays.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    {multiDays.length} day{multiDays.length !== 1 ? 's' : ''} — adjust times per day below
                  </p>
                  <button
                    onClick={() => setMultiDays(multiDays.map(d => ({ ...d, dropOffTime, pickUpTime })))}
                    style={{ fontSize: 11, color: 'var(--cta-purple)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                  >
                    Reset all times
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '0 2px' }}>
                    <p style={{ fontSize: 10, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', margin: 0 }}>Date</p>
                    <p style={{ fontSize: 10, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', margin: 0 }}>Drop-off</p>
                    <p style={{ fontSize: 10, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', margin: 0 }}>Pick-up</p>
                  </div>
                  {multiDays.map((d, i) => (
                    <div key={d.date} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, alignItems: 'center', background: i % 2 === 0 ? 'var(--surface-3)' : 'transparent', borderRadius: 6, padding: '4px 6px' }}>
                      <p style={{ fontSize: 12, color: 'var(--text)', margin: 0, fontWeight: 500 }}>{formatDayLabel(d.date)}</p>
                      <TimeSelect
                        value={d.dropOffTime}
                        onChange={val => setMultiDays(prev => prev.map((day, j) => j === i ? { ...day, dropOffTime: val } : day))}
                        minHour={7} maxHour={21}
                      />
                      <TimeSelect
                        value={d.pickUpTime}
                        onChange={val => setMultiDays(prev => prev.map((day, j) => j === i ? { ...day, pickUpTime: val } : day))}
                        minHour={7} maxHour={21}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {multiDays.length > 0 && (
              <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text)', marginTop: 12 }}>
                {`${formatDateReadable(multiDays[0].date)} to ${formatDateReadable(multiDays[multiDays.length - 1].date)} — ${multiDays.length} day${multiDays.length !== 1 ? 's' : ''}`}
              </div>
            )}
          </div>
        )}

        {/* Warnings (single-day only) */}
        {!isMultiDay && unavailableWarning && (
          <div style={{ background: 'var(--tint-red)', border: '1px solid var(--tint-red-text)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--tint-red-text)' }}>
            <p style={{ fontWeight: 600, margin: 0 }}>{unavailableWarning}</p>
            <p style={{ margin: '4px 0 0', opacity: 0.8 }}>You can still save this booking if you&apos;re sure it&apos;s correct.</p>
          </div>
        )}
        {!isMultiDay && capacityWarning && (
          <div style={{ background: 'var(--tint-gold)', border: '1px solid var(--gold)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--tint-gold-text)' }}>
            {capacityWarning}
          </div>
        )}
        {!isMultiDay && soloWarnings.length > 0 && (
          <div style={{ background: 'var(--tint-amber)', border: '1px solid var(--tint-amber-text)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--tint-amber-text)' }}>
            <p style={{ fontWeight: 600, margin: 0 }}>Solo dog conflict — {soloWarnings.map(w => w.dogName).join(', ')} {soloWarnings.length === 1 ? 'is' : 'are'} also booked on these dates.</p>
            <p style={{ margin: '4px 0 0', opacity: 0.8 }}>You can still proceed if you&apos;re sure this is correct.</p>
          </div>
        )}
        {!isMultiDay && conflictWarnings.map((w, i) => (
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
          <Btn onClick={isMultiDay ? handleSubmitGroup : handleSubmitSingle} disabled={saving} variant="primary">
            {saving ? 'Creating…' : isMultiDay ? `Confirm ${multiDays.length} Bookings` : 'Confirm Booking'}
          </Btn>
          <Btn onClick={() => router.back()} variant="secondary">Cancel</Btn>
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
