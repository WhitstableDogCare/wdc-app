'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHead, Card, Pill, StatTile } from '../components/ui'
import type { UnifiedEvent, UnifiedTask } from '@/app/api/calendar/unified/route'

interface Booking {
  id: number
  booking_type: string
  dog_name: string
  owner_name: string | null
  start_date: string
  end_date: string | null
  drop_off_time: string | null
  pick_up_time: string | null
  status: string
  dog: { id: number; name: string; photo_path: string | null } | null
}

interface UnavailablePeriod {
  id: number
  start_date: string
  end_date: string
  reason: string
}

type DayItem =
  | { kind: 'booking'; b: Booking }
  | { kind: 'event'; e: UnifiedEvent }
  | { kind: 'task'; t: UnifiedTask }
  | { kind: 'unavailable'; p: UnavailablePeriod }

function bookingPillColor(type: string): 'purple' | 'gold' {
  return type.startsWith('Boarding') ? 'purple' : 'gold'
}

function nightsBetween(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)))
}

function effectiveStart(b: Booking) { return b.start_date }
function effectiveEnd(b: Booking) { return b.end_date ?? b.start_date }
function isBookingToday(b: Booking) {
  const today = new Date().toISOString().split('T')[0]
  return effectiveStart(b) <= today && effectiveEnd(b) >= today
}

function groupByMonth(bookings: Booking[]) {
  const groups: Record<string, Booking[]> = {}
  for (const b of bookings) {
    const key = new Date(effectiveStart(b) + 'T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  }
  return groups
}

function groupUnavailableByMonth(periods: UnavailablePeriod[]) {
  const groups: Record<string, UnavailablePeriod[]> = {}
  for (const p of periods) {
    const key = new Date(p.start_date + 'T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  }
  return groups
}

function fmtTime(t: string | null) { return t ? t.slice(0, 5) : '' }
function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtEventTime(iso: string) {
  if (!iso.includes('T')) return ''
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function BookingDateLine({ b }: { b: Booking }) {
  const start = effectiveStart(b)
  const end = effectiveEnd(b)
  const isBoarding = b.booking_type === 'Boarding'
  if (isBoarding && end !== start) {
    const nights = nightsBetween(start, end)
    return <>{fmtDate(start)} → {fmtDate(end)}{nights > 0 ? ` (${nights}n)` : ''}</>
  }
  if (b.drop_off_time || b.pick_up_time) {
    return <>{fmtTime(b.drop_off_time)} → {fmtTime(b.pick_up_time)}</>
  }
  return <>{fmtDate(start)}</>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 500, margin: '0 0 8px' }}>
      {children}
    </p>
  )
}

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [unavailablePeriods, setUnavailablePeriods] = useState<UnavailablePeriod[]>([])
  const [personalEvents, setPersonalEvents] = useState<UnifiedEvent[]>([])
  const [familyEvents, setFamilyEvents] = useState<UnifiedEvent[]>([])
  const [tasks, setTasks] = useState<UnifiedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDue, setNewTaskDue] = useState('')
  const [addingTask, setAddingTask] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]
  const in28Days = addDays(todayStr, 27)

  useEffect(() => {
    Promise.all([
      fetch('/api/bookings').then(r => r.json()),
      fetch('/api/unavailable-periods').then(r => r.json()),
      fetch(`/api/calendar/unified?start=${todayStr}&end=${in28Days}`).then(r => r.json()),
    ]).then(([bData, uData, unified]) => {
      setBookings(Array.isArray(bData) ? bData : [])
      setUnavailablePeriods(Array.isArray(uData) ? uData : [])
      setPersonalEvents(Array.isArray(unified.personalEvents) ? unified.personalEvents : [])
      setFamilyEvents(Array.isArray(unified.familyEvents) ? unified.familyEvents : [])
      setTasks(Array.isArray(unified.tasks) ? unified.tasks : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expanded = bookings.filter(b => b.status !== 'Cancelled')

  const handleCompleteTask = async (id: string, tasklistId: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasklistId }),
    })
  }

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return
    setAddingTask(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTaskTitle.trim(), due: newTaskDue || null }),
    })
    const data = await res.json()
    if (data.id) setTasks(prev => [...prev, data])
    setNewTaskTitle(''); setNewTaskDue(''); setShowAddTask(false); setAddingTask(false)
  }

  const todayGuests = expanded.filter(b => isBookingToday(b))
  const allEvents = [...personalEvents, ...familyEvents]

  // Stats
  const pastBookings2 = bookings.filter(b =>
    b.status !== 'Cancelled' && new Date((b.end_date ?? b.start_date) + 'T23:59:00') < today
  )
  const boardingNights = pastBookings2.filter(b => b.booking_type === 'Boarding').reduce((s, b) => s + (b.end_date ? nightsBetween(b.start_date, b.end_date) : 1), 0)
  const daycareDays    = pastBookings2.filter(b => b.booking_type === 'Daycare').length
  const boardingTrials = pastBookings2.filter(b => b.booking_type === 'Boarding Trial').length
  const daycareTrials  = pastBookings2.filter(b => b.booking_type === 'Daycare Trial').length

  // Day-by-day items for next 28 days
  const dayItems: { date: string; items: DayItem[] }[] = []
  for (let i = 0; i < 28; i++) {
    const date = addDays(todayStr, i)
    const items: DayItem[] = []
    for (const b of expanded) { if (effectiveStart(b) === date) items.push({ kind: 'booking', b }) }
    for (const p of unavailablePeriods) { if (p.start_date === date) items.push({ kind: 'unavailable', p }) }
    for (const e of allEvents) {
      const eventDate = e.isAllDay ? e.start : e.start.split('T')[0]
      if (eventDate === date) items.push({ kind: 'event', e })
    }
    for (const t of tasks) {
      const taskDate = t.due ?? todayStr
      if (taskDate === date) items.push({ kind: 'task', t })
    }
    if (items.length > 0) dayItems.push({ date, items })
  }

  // Far future
  const farFutureStart = addDays(todayStr, 28)
  const farFutureBookings = expanded.filter(b => effectiveStart(b) >= farFutureStart).sort((a, b) => effectiveStart(a).localeCompare(effectiveStart(b)))
  const farFutureUnavailable = unavailablePeriods.filter(p => p.start_date >= farFutureStart)
  const farFutureBookingGroups = groupByMonth(farFutureBookings)
  const farFutureUnavailableGroups = groupUnavailableByMonth(farFutureUnavailable)
  const allFarFutureMonths = new Set([...Object.keys(farFutureBookingGroups), ...Object.keys(farFutureUnavailableGroups)])
  const sortedFarFutureMonths = Array.from(allFarFutureMonths).sort((a, b) => {
    const dateA = new Date((farFutureBookingGroups[a]?.[0] ? effectiveStart(farFutureBookingGroups[a][0]) : farFutureUnavailableGroups[a]?.[0]?.start_date ?? '') + 'T12:00:00')
    const dateB = new Date((farFutureBookingGroups[b]?.[0] ? effectiveStart(farFutureBookingGroups[b][0]) : farFutureUnavailableGroups[b]?.[0]?.start_date ?? '') + 'T12:00:00')
    return dateA.getTime() - dateB.getTime()
  })

  const pastBookings = bookings.filter(b => b.status !== 'Cancelled' && new Date((b.end_date ?? b.start_date) + 'T23:59:00') < today).sort((a, b) => b.start_date.localeCompare(a.start_date))

  return (
    <div style={{ maxWidth: 760 }}>
      <PageHead title="Calendar" />

      {loading && <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Loading…</div>}

      {!loading && (
        <>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            <StatTile value={boardingNights} label="Boarding Nights" tint="purple" />
            <StatTile value={daycareDays}    label="Daycare Days"    tint="gold"   />
            <StatTile value={boardingTrials} label="Boarding Trials" tint="purple" />
            <StatTile value={daycareTrials}  label="Daycare Trials"  tint="gold"   />
          </div>

          {/* Today */}
          {todayGuests.length > 0 && (
            <div style={{ background: 'var(--gold)', borderRadius: 'var(--density-radius-card)', padding: '16px 18px', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 10px' }}>With You Today</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {todayGuests.map((b, i) => (
                  <Link key={`${b.id}-today-${i}`} href={`/bookings/${b.id}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: '10px 12px', gap: 10 }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--charcoal)', fontSize: 13 }}>{b.dog_name}</span>
                      <p style={{ fontSize: 11, color: 'rgba(61,61,61,0.7)', marginTop: 2 }}>
                        {b.drop_off_time || b.pick_up_time ? `${fmtTime(b.drop_off_time)} → ${fmtTime(b.pick_up_time)}` : fmtDate(effectiveStart(b))}
                      </p>
                    </div>
                    <Pill color={bookingPillColor(b.booking_type)}>{b.booking_type}</Pill>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Next 28 days */}
          {dayItems.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Upcoming</h2>
                <button onClick={() => setShowAddTask(v => !v)}
                  style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {showAddTask ? 'Cancel' : '+ Task'}
                </button>
              </div>

              {showAddTask && (
                <div style={{ marginBottom: 14, background: 'var(--surface-app)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                    placeholder="Task title…" autoFocus style={{ width: '100%' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)} min={todayStr} style={{ flex: 1 }} />
                    <button onClick={handleAddTask} disabled={addingTask || !newTaskTitle.trim()}
                      style={{ background: 'var(--cta-purple)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: (addingTask || !newTaskTitle.trim()) ? 0.6 : 1 }}>
                      {addingTask ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>Leave date empty to show under today.</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {dayItems.map(({ date, items }) => {
                  const isToday = date === todayStr
                  return (
                    <div key={date}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        {isToday && (
                          <span style={{ fontFamily: 'var(--font-label)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, background: 'var(--cta-purple)', color: '#fff', padding: '2px 8px', borderRadius: 50 }}>TODAY</span>
                        )}
                        <SectionLabel>{new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</SectionLabel>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {items.map((item, i) => {
                          if (item.kind === 'booking') {
                            const b = item.b
                            const isNow = isBookingToday(b)
                            return (
                              <Link key={`booking-${b.id}-${i}`} href={`/bookings/${b.id}`}
                                style={{ background: 'var(--surface-2)', border: `1px solid ${isNow ? 'var(--cta-purple)' : 'var(--border)'}`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  {b.dog?.photo_path ? (
                                    <img src={b.dog.photo_path} alt={b.dog_name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                  ) : (
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--tint-neutral)', flexShrink: 0 }} />
                                  )}
                                  <div>
                                    <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{b.dog_name}</span>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                                      <BookingDateLine b={b} />
                                    </p>
                                  </div>
                                </div>
                                <Pill color={bookingPillColor(b.booking_type)}>{b.booking_type}</Pill>
                              </Link>
                            )
                          }

                          if (item.kind === 'event') {
                            const e = item.e
                            const isFamily = e.source === 'family'
                            const startTime = fmtEventTime(e.start)
                            const endTime = fmtEventTime(e.end)
                            return (
                              <div key={`event-${e.id}-${i}`}
                                style={{ background: isFamily ? 'var(--tint-green)' : 'var(--tint-blue)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                <div>
                                  <p style={{ fontWeight: 600, fontSize: 13, color: isFamily ? 'var(--tint-green-text)' : 'var(--tint-blue-text)', margin: 0 }}>{e.title}</p>
                                  {!e.isAllDay && startTime && (
                                    <p style={{ fontSize: 11, color: isFamily ? 'var(--tint-green-text)' : 'var(--tint-blue-text)', opacity: 0.8, marginTop: 2 }}>
                                      {startTime}{endTime && endTime !== startTime ? ` → ${endTime}` : ''}
                                    </p>
                                  )}
                                </div>
                                <Pill color={isFamily ? 'green' : 'blue'}>{isFamily ? 'Family' : 'Personal'}</Pill>
                              </div>
                            )
                          }

                          if (item.kind === 'task') {
                            const t = item.t
                            return (
                              <div key={`task-${t.id}-${i}`}
                                style={{ background: 'var(--surface-app)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <button
                                  onClick={() => handleCompleteTask(t.id, t.tasklistId)}
                                  style={{ width: 18, height: 18, borderRadius: 4, border: '2px solid var(--border-strong)', flexShrink: 0, background: 'none', cursor: 'pointer' }}
                                  title="Mark complete"
                                />
                                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{t.title}</p>
                              </div>
                            )
                          }

                          if (item.kind === 'unavailable') {
                            const p = item.p
                            return (
                              <div key={`unavail-${p.id}`}
                                style={{ background: 'var(--tint-neutral)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                <div>
                                  <p style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Unavailable — {p.reason}</p>
                                  <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                                    {p.start_date === p.end_date ? fmtDate(p.start_date) : <>{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</>}
                                  </p>
                                </div>
                                <Pill color="neutral">Unavailable</Pill>
                              </div>
                            )
                          }
                          return null
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Far future */}
          {sortedFarFutureMonths.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Further Ahead</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {sortedFarFutureMonths.map(month => {
                  const monthBookings = farFutureBookingGroups[month] ?? []
                  const monthUnavailable = farFutureUnavailableGroups[month] ?? []
                  type Row = { date: string } & ({ kind: 'booking'; b: Booking } | { kind: 'unavailable'; p: UnavailablePeriod })
                  const rows: Row[] = [
                    ...monthBookings.map(b => ({ kind: 'booking' as const, b, date: effectiveStart(b) })),
                    ...monthUnavailable.map(p => ({ kind: 'unavailable' as const, p, date: p.start_date })),
                  ].sort((a, b) => a.date.localeCompare(b.date))

                  return (
                    <div key={month}>
                      <SectionLabel>{month}</SectionLabel>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {rows.map((row, i) => {
                          if (row.kind === 'unavailable') {
                            const p = row.p
                            const startD = new Date(p.start_date + 'T12:00:00')
                            return (
                              <div key={`unavail-${p.id}`}
                                style={{ background: 'var(--tint-neutral)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div style={{ textAlign: 'center', minWidth: 32 }}>
                                    <p style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1 }}>{startD.toLocaleDateString('en-GB', { month: 'short' })}</p>
                                    <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1.2 }}>{startD.getDate()}</p>
                                  </div>
                                  <div>
                                    <p style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Unavailable — {p.reason}</p>
                                    <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                                      {p.start_date === p.end_date ? fmtDate(p.start_date) : <>{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</>}
                                    </p>
                                  </div>
                                </div>
                                <Pill color="neutral">Unavailable</Pill>
                              </div>
                            )
                          }

                          const b = row.b
                          const startD = new Date(effectiveStart(b) + 'T12:00:00')
                          return (
                            <Link key={`${b.id}-${i}`} href={`/bookings/${b.id}`}
                              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ textAlign: 'center', minWidth: 32 }}>
                                  <p style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1 }}>{startD.toLocaleDateString('en-GB', { month: 'short' })}</p>
                                  <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{startD.getDate()}</p>
                                </div>
                                <div>
                                  <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{b.dog_name}</span>
                                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                    <BookingDateLine b={b} />
                                  </p>
                                </div>
                              </div>
                              <Pill color={bookingPillColor(b.booking_type)}>{b.booking_type}</Pill>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Past bookings */}
          {pastBookings.length > 0 && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-label)', letterSpacing: '0.06em', textTransform: 'uppercase' } as React.CSSProperties}>
                Past bookings ({pastBookings.length})
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {pastBookings.slice(0, 30).map((b, i) => (
                  <Link key={`past-${b.id}-${i}`} href={`/bookings/${b.id}`}
                    style={{ background: 'var(--surface-app)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, opacity: 0.7 }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{b.dog_name}</span>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(b.start_date)}</p>
                    </div>
                    <Pill color={bookingPillColor(b.booking_type)}>{b.booking_type}</Pill>
                  </Link>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}
