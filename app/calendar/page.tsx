'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { UnifiedEvent, UnifiedTask } from '@/app/api/calendar/unified/route'

const CAL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
  is_recurring: boolean
  day_of_week: number | null
  dog: { id: number; name: string; photo_path: string | null } | null
  _virtual_date?: string
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

function badgeStyle(type: string) {
  if (type === 'Boarding')       return 'bg-purple-100 text-purple-700'
  if (type === 'Boarding Trial') return 'bg-purple-50 text-purple-500 border border-purple-200'
  if (type === 'Daycare Trial')  return 'bg-yellow-50 text-yellow-600 border border-yellow-200'
  return 'bg-yellow-100 text-yellow-700'
}

function bookingIcon(type: string) { return type.startsWith('Boarding') ? '🌙' : '☀️' }

function nightsBetween(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)))
}

function getNextOccurrences(dayOfWeek: number, count = 8): string[] {
  const dates: string[] = []
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const daysUntil = (dayOfWeek - d.getDay() + 7) % 7
  d.setDate(d.getDate() + daysUntil)
  for (let i = 0; i < count; i++) {
    dates.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 7)
  }
  return dates
}

function effectiveStart(b: Booking) { return b._virtual_date ?? b.start_date }
function effectiveEnd(b: Booking) {
  if (b._virtual_date) return b._virtual_date
  return b.end_date ?? b.start_date
}

function isBookingToday(b: Booking) {
  const today = new Date().toISOString().split('T')[0]
  return effectiveStart(b) <= today && effectiveEnd(b) >= today
}

function groupByMonth(bookings: Booking[]) {
  const groups: Record<string, Booking[]> = {}
  for (const b of bookings) {
    const key = new Date(effectiveStart(b) + 'T12:00:00')
      .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  }
  return groups
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

function fmtTime(t: string | null) { return t ? t.slice(0, 5) : '' }

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtDayHeader(dateStr: string) {
  return new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
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

function StatsBar({ bookings }: { bookings: Booking[] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const past = bookings.filter(b =>
    !b.is_recurring && new Date((b.end_date ?? b.start_date) + 'T23:59:00') < today
  )
  const boardingNights = past.filter(b => b.booking_type === 'Boarding').reduce((s, b) => s + (b.end_date ? nightsBetween(b.start_date, b.end_date) : 1), 0)
  const daycareDays    = past.filter(b => b.booking_type === 'Daycare').length
  const boardingTrials = past.filter(b => b.booking_type === 'Boarding Trial').length
  const daycareTrials  = past.filter(b => b.booking_type === 'Daycare Trial').length
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-purple-50 rounded-xl p-4 text-center">
        <p className="text-2xl font-bold text-purple-700">{boardingNights}</p>
        <p className="text-xs text-purple-500 mt-0.5 font-medium">Boarding Nights</p>
      </div>
      <div className="bg-yellow-50 rounded-xl p-4 text-center">
        <p className="text-2xl font-bold text-yellow-700">{daycareDays}</p>
        <p className="text-xs text-yellow-600 mt-0.5 font-medium">Daycare Days</p>
      </div>
      <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
        <p className="text-2xl font-bold text-purple-400">{boardingTrials}</p>
        <p className="text-xs text-purple-400 mt-0.5 font-medium">Boarding Trials</p>
      </div>
      <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-100">
        <p className="text-2xl font-bold text-yellow-500">{daycareTrials}</p>
        <p className="text-xs text-yellow-500 mt-0.5 font-medium">Daycare Trials</p>
      </div>
    </div>
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

  // Expand recurring bookings into individual occurrences
  const expanded: Booking[] = []
  for (const b of bookings) {
    if (b.status === 'Cancelled') continue
    if (b.is_recurring && b.day_of_week != null) {
      for (const date of getNextOccurrences(b.day_of_week, 8)) {
        expanded.push({ ...b, _virtual_date: date })
      }
    } else {
      expanded.push(b)
    }
  }

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
    setNewTaskTitle('')
    setNewTaskDue('')
    setShowAddTask(false)
    setAddingTask(false)
  }

  // "With You Today" — bookings active today
  const todayGuests = expanded.filter(b => isBookingToday(b))

  // All events (personal + family)
  const allEvents = [...personalEvents, ...familyEvents]

  // Build day-by-day items for next 28 days
  const dayItems: { date: string; items: DayItem[] }[] = []
  for (let i = 0; i < 28; i++) {
    const date = addDays(todayStr, i)
    const items: DayItem[] = []

    // Bookings starting on this date (only future starts)
    for (const b of expanded) {
      if (effectiveStart(b) === date) items.push({ kind: 'booking', b })
    }

    // Unavailable periods starting on this date
    for (const p of unavailablePeriods) {
      if (p.start_date === date) items.push({ kind: 'unavailable', p })
    }

    // Calendar events on this date
    for (const e of allEvents) {
      const eventDate = e.isAllDay ? e.start : e.start.split('T')[0]
      if (eventDate === date) items.push({ kind: 'event', e })
    }

    // Tasks due on this date (null due date → today)
    for (const t of tasks) {
      const taskDate = t.due ?? todayStr
      if (taskDate === date) items.push({ kind: 'task', t })
    }

    if (items.length > 0) dayItems.push({ date, items })
  }

  // Far future: bookings + unavailable beyond 28 days, month-grouped
  const farFutureStart = addDays(todayStr, 28)
  const farFutureBookings = expanded
    .filter(b => effectiveStart(b) >= farFutureStart)
    .sort((a, b) => effectiveStart(a).localeCompare(effectiveStart(b)))
  const farFutureUnavailable = unavailablePeriods.filter(p => p.start_date >= farFutureStart)

  const farFutureBookingGroups = groupByMonth(farFutureBookings)
  const farFutureUnavailableGroups = groupUnavailableByMonth(farFutureUnavailable)

  const allFarFutureMonths = new Set([
    ...Object.keys(farFutureBookingGroups),
    ...Object.keys(farFutureUnavailableGroups),
  ])
  const sortedFarFutureMonths = Array.from(allFarFutureMonths).sort((a, b) => {
    const dateA = new Date((farFutureBookingGroups[a]?.[0] ? effectiveStart(farFutureBookingGroups[a][0]) : farFutureUnavailableGroups[a]?.[0]?.start_date ?? '') + 'T12:00:00')
    const dateB = new Date((farFutureBookingGroups[b]?.[0] ? effectiveStart(farFutureBookingGroups[b][0]) : farFutureUnavailableGroups[b]?.[0]?.start_date ?? '') + 'T12:00:00')
    return dateA.getTime() - dateB.getTime()
  })

  // Past bookings
  const pastBookings = bookings
    .filter(b => !b.is_recurring && b.status !== 'Cancelled' && new Date((b.end_date ?? b.start_date) + 'T23:59:00') < today)
    .sort((a, b) => b.start_date.localeCompare(a.start_date))

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Calendar</h1>

      {loading && <div className="text-center py-16 text-gray-500">Loading...</div>}

      {!loading && (
        <>
          <StatsBar bookings={bookings} />

          {/* With You Today */}
          {todayGuests.length > 0 && (
            <div className="bg-[#2d6a4f] text-white rounded-2xl p-5 mb-6">
              <h2 className="font-bold text-lg mb-3">🐾 With You Today</h2>
              <div className="space-y-2">
                {todayGuests.map((b, i) => (
                  <div key={b._virtual_date ? `${b.id}-${b._virtual_date}` : `${b.id}-today-${i}`}
                    className="flex items-center justify-between bg-white/15 rounded-xl px-4 py-2.5">
                    <div>
                      {b.dog?.id
                        ? <Link href={`/dogs/${b.dog.id}`} className="font-semibold hover:underline">{b.dog_name}</Link>
                        : <span className="font-semibold">{b.dog_name}</span>
                      }
                      <p className="text-xs text-white/75 mt-0.5">
                        {b.drop_off_time || b.pick_up_time
                          ? `${fmtTime(b.drop_off_time)} → ${fmtTime(b.pick_up_time)}`
                          : fmtDate(effectiveStart(b))
                        }
                        {b.is_recurring && b.day_of_week != null && ` · Every ${CAL_DAY_NAMES[b.day_of_week]}`}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeStyle(b.booking_type)}`}>
                      {bookingIcon(b.booking_type)} {b.booking_type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next 28 days — day by day */}
          {dayItems.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-700">Upcoming</h2>
                <button onClick={() => setShowAddTask(v => !v)}
                  className="text-sm px-3 py-1.5 rounded-lg font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  {showAddTask ? 'Cancel' : '+ Task'}
                </button>
              </div>

              {showAddTask && (
                <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                    placeholder="Task title..."
                    autoFocus
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={newTaskDue}
                      onChange={e => setNewTaskDue(e.target.value)}
                      min={todayStr}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                    <button onClick={handleAddTask} disabled={addingTask || !newTaskTitle.trim()}
                      className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
                      {addingTask ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">Leave date empty to show under today.</p>
                </div>
              )}
              <div className="space-y-5">
                {dayItems.map(({ date, items }) => {
                  const isToday = date === todayStr
                  return (
                    <div key={date}>
                      <div className="flex items-center gap-2 mb-2">
                        {isToday && (
                          <span className="text-xs font-bold bg-[#2d6a4f] text-white px-2 py-0.5 rounded-full">TODAY</span>
                        )}
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          {fmtDayHeader(date)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {items.map((item, i) => {
                          if (item.kind === 'booking') {
                            const b = item.b
                            const isNow = isBookingToday(b)
                            return (
                              <div key={`booking-${b.id}-${i}`}
                                className={`bg-white border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${isNow ? 'border-[#2d6a4f] shadow-sm' : 'border-gray-100'}`}>
                                <div className="flex items-center gap-3">
                                  {b.dog?.photo_path ? (
                                    <img src={b.dog.photo_path} alt={b.dog_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 text-base">🐾</div>
                                  )}
                                  <div>
                                    {b.dog?.id
                                      ? <Link href={`/dogs/${b.dog.id}`} className="font-semibold text-gray-800 hover:text-[#2d6a4f] text-sm">{b.dog_name}</Link>
                                      : <span className="font-semibold text-gray-800 text-sm">{b.dog_name}</span>
                                    }
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      <BookingDateLine b={b} />
                                      {b.is_recurring && b.day_of_week != null && (
                                        <span className="ml-1.5 text-blue-400">🔁 {CAL_DAY_NAMES[b.day_of_week]}s</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <Link href={`/bookings/${b.id}`}
                                  className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full hover:opacity-80 transition-opacity ${badgeStyle(b.booking_type)}`}>
                                  {bookingIcon(b.booking_type)} {b.booking_type}
                                </Link>
                              </div>
                            )
                          }

                          if (item.kind === 'event') {
                            const e = item.e
                            const isFamily = e.source === 'family'
                            const startTime = fmtEventTime(e.start)
                            const endTime = fmtEventTime(e.end)
                            return (
                              <div key={`event-${e.id}-${i}`}
                                className={`border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${isFamily ? 'bg-teal-50 border-teal-100' : 'bg-blue-50 border-blue-100'}`}>
                                <div className="flex items-center gap-3">
                                  <span className="text-base flex-shrink-0">{isFamily ? '👨‍👩‍👧' : '🗓'}</span>
                                  <div>
                                    <p className={`font-semibold text-sm ${isFamily ? 'text-teal-800' : 'text-blue-800'}`}>{e.title}</p>
                                    {!e.isAllDay && startTime && (
                                      <p className={`text-xs mt-0.5 ${isFamily ? 'text-teal-600' : 'text-blue-600'}`}>
                                        {startTime}{endTime && endTime !== startTime ? ` → ${endTime}` : ''}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${isFamily ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {isFamily ? 'Family' : 'Personal'}
                                </span>
                              </div>
                            )
                          }

                          if (item.kind === 'task') {
                            const t = item.t
                            return (
                              <div key={`task-${t.id}-${i}`}
                                className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
                                <button
                                  onClick={() => handleCompleteTask(t.id, t.tasklistId)}
                                  className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0 hover:border-[#2d6a4f] hover:bg-[#2d6a4f]/10 transition-colors"
                                  title="Mark complete"
                                />
                                <p className="text-sm font-medium text-gray-700">{t.title}</p>
                              </div>
                            )
                          }

                          if (item.kind === 'unavailable') {
                            const p = item.p
                            return (
                              <div key={`unavail-${p.id}`}
                                className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-base flex-shrink-0">🚫</span>
                                  <div>
                                    <p className="font-semibold text-gray-600 text-sm">Unavailable — {p.reason}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {p.start_date === p.end_date
                                        ? fmtDate(p.start_date)
                                        : <>{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</>
                                      }
                                    </p>
                                  </div>
                                </div>
                                <span className="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-500">
                                  Unavailable
                                </span>
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

          {/* Far future: beyond 28 days — bookings + unavailable only, month-grouped */}
          {sortedFarFutureMonths.length > 0 && (
            <div className="mb-6">
              <h2 className="font-semibold text-gray-700 mb-3">Further Ahead</h2>
              <div className="space-y-6">
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
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{month}</h3>
                      <div className="space-y-2">
                        {rows.map((row, i) => {
                          if (row.kind === 'unavailable') {
                            const p = row.p
                            const startD = new Date(p.start_date + 'T12:00:00')
                            return (
                              <div key={`unavail-${p.id}`}
                                className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="text-center min-w-[36px]">
                                    <p className="text-xs text-gray-400 leading-none">{startD.toLocaleDateString('en-GB', { month: 'short' })}</p>
                                    <p className="text-xl font-bold text-gray-500 leading-tight">{startD.getDate()}</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-500 text-sm">Unavailable — {p.reason}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {p.start_date === p.end_date
                                        ? fmtDate(p.start_date)
                                        : <>{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</>
                                      }
                                    </p>
                                  </div>
                                </div>
                                <span className="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-500">🚫 Unavailable</span>
                              </div>
                            )
                          }

                          const b = row.b
                          const startD = new Date(effectiveStart(b) + 'T12:00:00')
                          return (
                            <div key={`${b.id}-${i}`}
                              className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="text-center min-w-[36px]">
                                  <p className="text-xs text-gray-400 leading-none">{startD.toLocaleDateString('en-GB', { month: 'short' })}</p>
                                  <p className="text-xl font-bold text-gray-800 leading-tight">{startD.getDate()}</p>
                                </div>
                                <div>
                                  {b.dog?.id
                                    ? <Link href={`/dogs/${b.dog.id}`} className="font-semibold text-gray-800 hover:text-[#2d6a4f] text-sm">{b.dog_name}</Link>
                                    : <span className="font-semibold text-gray-800 text-sm">{b.dog_name}</span>
                                  }
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    <BookingDateLine b={b} />
                                    {b.is_recurring && b.day_of_week != null && (
                                      <span className="ml-1.5 text-blue-400">🔁 {CAL_DAY_NAMES[b.day_of_week]}s</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <Link href={`/bookings/${b.id}`}
                                className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full hover:opacity-80 transition-opacity ${badgeStyle(b.booking_type)}`}>
                                {bookingIcon(b.booking_type)} {b.booking_type}
                              </Link>
                            </div>
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
            <details className="mt-4">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 font-medium mb-3">
                Past bookings ({pastBookings.length})
              </summary>
              <div className="space-y-2 mt-3">
                {pastBookings.slice(0, 30).map((b, i) => (
                  <div key={`past-${b.id}-${i}`}
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3 opacity-70">
                    <div>
                      {b.dog?.id
                        ? <Link href={`/dogs/${b.dog.id}`} className="font-semibold text-gray-700 hover:text-[#2d6a4f] text-sm">{b.dog_name}</Link>
                        : <span className="font-semibold text-gray-700 text-sm">{b.dog_name}</span>
                      }
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(b.start_date)}</p>
                    </div>
                    <Link href={`/bookings/${b.id}`}
                      className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full hover:opacity-80 transition-opacity ${badgeStyle(b.booking_type)}`}>
                      {bookingIcon(b.booking_type)} {b.booking_type}
                    </Link>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}
