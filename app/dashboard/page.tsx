'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type VisitType = 'Boarding' | 'Daycare' | 'Boarding Trial' | 'Daycare Trial'

interface Invoice {
  id: number
  invoice_number: string
  invoice_date: string | null
  due_date: string | null
  paid_date: string | null
  dog_name: string | null
  client_name: string | null
  total: number
  status: string
}

interface CalEvent {
  uid: string
  visitType: VisitType
  dogName: string
  dogId: number | null
  start: string
  end: string
  allDay: boolean
}

interface GoogleTask {
  id: string
  title: string
  due: string | null
  listTitle: string
  notes: string | null
}

interface DogStats {
  total: number
  withPhoto: number
  withoutPhoto: number
  withVet: number
  noVet: number
  newThisMonth: number
  newThisYear: number
  sexBreakdown: Record<string, number>
  neuteredCount: number
  intactCount: number
  unknownNeutered: number
  energyBreakdown: Record<string, number>
  topBreeds: [string, number][]
  overdueVaccinations: { id: number; name: string; vaccination_date: string | null }[]
  missingVaccinations: { id: number; name: string }[]
}

function nightsBetween(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000))
}

// UK tax year: 6 Apr → 5 Apr
function getTaxYearStart(date: Date): Date {
  const m = date.getMonth(), d = date.getDate(), y = date.getFullYear()
  const startYear = (m > 3 || (m === 3 && d >= 6)) ? y : y - 1
  return new Date(startYear, 3, 6)
}
function getTaxYearEnd(start: Date): Date {
  return new Date(start.getFullYear() + 1, 3, 6)
}
function taxYearLabel(start: Date): string {
  return `${start.getFullYear()}/${String(start.getFullYear() + 1).slice(2)}`
}

function isInPeriod(start: string, end: string, from: Date, to: Date) {
  const s = new Date(start), e = new Date(end)
  return s < to && e > from
}

function StatCard({ label, value, sub, href, color = 'gray' }: {
  label: string; value: number | string; sub?: string; href?: string; color?: string
}) {
  const colorMap: Record<string, string> = {
    green:  'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red:    'bg-red-50 text-red-700',
    blue:   'bg-blue-50 text-blue-700',
    gray:   'bg-gray-50 text-gray-700',
  }
  const cls = colorMap[color] ?? colorMap.gray
  const inner = (
    <div className={`${cls} rounded-xl p-4 text-center h-full`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>
}

function MiniBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs text-gray-600 w-32 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className="bg-[#2d6a4f] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-5 text-right">{value}</span>
    </div>
  )
}

function MonthBar({ month, boarding, daycare, income, max }: { month: string; boarding: number; daycare: number; income: number; max: number }) {
  const total = boarding + daycare
  const pct = max > 0 ? Math.round((total / max) * 100) : 0
  const incomeLabel = income >= 1000 ? `£${(income / 1000).toFixed(1)}k` : income > 0 ? `£${Math.round(income)}` : ''
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs text-gray-500 w-8 flex-shrink-0">{month}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
        <div className="h-3 flex rounded-full overflow-hidden" style={{ width: `${pct}%` }}>
          <div className="bg-purple-400 h-full" style={{ width: boarding + daycare > 0 ? `${Math.round(boarding / total * 100)}%` : '0' }} />
          <div className="bg-yellow-300 h-full" style={{ width: boarding + daycare > 0 ? `${Math.round(daycare / total * 100)}%` : '0' }} />
        </div>
      </div>
      <span className="text-xs text-gray-400 w-6 text-right">{total}</span>
      <span className="text-xs font-semibold text-green-600 w-14 text-right flex-shrink-0">{incomeLabel}</span>
    </div>
  )
}

export default function DashboardPage() {
  const [dogStats, setDogStats] = useState<DogStats | null>(null)
  const [events, setEvents] = useState<CalEvent[]>([])
  const [todayBookings, setTodayBookings] = useState<{ dogName: string; dogId: number | null; visitType: VisitType }[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [todayTasks, setTodayTasks] = useState<GoogleTask[]>([])
  const [pendingInvoiceCount, setPendingInvoiceCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/calendar').then(r => r.json()),
      fetch('/api/bookings').then(r => r.json()),
      fetch('/api/invoices').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()).catch(() => []),
      fetch('/api/invoices/bulk').then(r => r.json()).catch(() => []),
    ]).then(([dash, cal, bookings, invs, tasks, pending]) => {
      setDogStats(dash.dogs)
      setEvents(Array.isArray(cal) ? cal : [])
      setInvoices(Array.isArray(invs) ? invs : [])
      setTodayTasks(Array.isArray(tasks) ? tasks : [])
      setPendingInvoiceCount(Array.isArray(pending) ? pending.length : 0)
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const active = (Array.isArray(bookings) ? bookings : []).filter((b: { start_date: string; end_date: string | null; status: string }) =>
        b.status === 'Confirmed' &&
        b.start_date <= todayStr &&
        (b.end_date ?? b.start_date) >= todayStr
      ).map((b: { dog_name: string; dog_id: number | null; booking_type: string }) => ({
        dogName: b.dog_name,
        dogId: b.dog_id,
        visitType: b.booking_type as VisitType,
      }))
      setTodayBookings(active)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-16 text-gray-500">Loading dashboard...</div>

  const now      = new Date()
  const somStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const somEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const soyStart = getTaxYearStart(now)
  const soyEnd   = getTaxYearEnd(soyStart)

  const pastEvents = events.filter(e => new Date(e.end) < now)

  // This month calendar stats
  const monthEvents = events.filter(e => isInPeriod(e.start, e.end, somStart, somEnd))
  const monthBoardingNights = monthEvents.filter(e => e.visitType === 'Boarding').reduce((s, e) => s + nightsBetween(e.start, e.end), 0)
  const monthDaycareDays    = monthEvents.filter(e => e.visitType === 'Daycare').reduce((s, e) => s + Math.max(1, nightsBetween(e.start, e.end)), 0)
  const monthTrials         = monthEvents.filter(e => e.visitType.includes('Trial')).length

  // This year calendar stats
  const yearEvents = events.filter(e => isInPeriod(e.start, e.end, soyStart, soyEnd))
  const yearBoardingNights = yearEvents.filter(e => e.visitType === 'Boarding').reduce((s, e) => s + nightsBetween(e.start, e.end), 0)
  const yearDaycareDays    = yearEvents.filter(e => e.visitType === 'Daycare').reduce((s, e) => s + Math.max(1, nightsBetween(e.start, e.end)), 0)

  // Today's guests — compare dates only, not times
  const todayStr = now.toISOString().split('T')[0]
  const calToday = events.filter(e => e.start.split('T')[0] <= todayStr && e.end.split('T')[0] >= todayStr)
  const calNames = new Set(calToday.map(e => e.dogName.toLowerCase()))
  const bookingOnlyToday = todayBookings.filter(b => !calNames.has(b.dogName.toLowerCase()))
  const todayGuests: { uid?: string; dogName: string; dogId: number | null; visitType: VisitType }[] = [
    ...calToday,
    ...bookingOnlyToday,
  ]

  // Busiest months (last 12)
  const monthData: Record<string, { boarding: number; daycare: number; income: number }> = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    monthData[key] = { boarding: 0, daycare: 0, income: 0 }
  }
  for (const e of pastEvents) {
    const key = new Date(e.start).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    if (!monthData[key]) continue
    if (e.visitType === 'Boarding') monthData[key].boarding += nightsBetween(e.start, e.end)
    else if (e.visitType === 'Daycare') monthData[key].daycare += Math.max(1, nightsBetween(e.start, e.end))
  }
  for (const inv of invoices) {
    if (inv.status !== 'Paid' || !inv.paid_date) continue
    const key = new Date(inv.paid_date + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    if (!monthData[key]) continue
    monthData[key].income += inv.total
  }
  const maxMonthTotal = Math.max(...Object.values(monthData).map(m => m.boarding + m.daycare), 1)

  // Top guests (past bookings only)
  const guestMap: Record<string, { count: number; dogId: number | null }> = {}
  for (const e of pastEvents) {
    if (!guestMap[e.dogName]) guestMap[e.dogName] = { count: 0, dogId: e.dogId }
    guestMap[e.dogName].count++
  }
  const topGuests = Object.entries(guestMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
  const maxGuest = topGuests[0]?.[1].count ?? 1

  // Tax year invoice helpers
  function taxYearInvoices(start: Date): Invoice[] {
    const s = start.toISOString().split('T')[0]
    const e = new Date(start.getFullYear() + 1, 3, 6).toISOString().split('T')[0]
    return invoices.filter(i => i.invoice_date && i.invoice_date >= s && i.invoice_date < e)
  }
  function taxYearStats(start: Date) {
    const tyInvs = taxYearInvoices(start).filter(i => i.status !== 'Void')
    return {
      invoices: tyInvs,
      total:   tyInvs.reduce((s, i) => s + i.total, 0),
      paid:    tyInvs.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0),
      unpaid:  tyInvs.filter(i => i.status !== 'Paid').reduce((s, i) => s + i.total, 0),
      count:   tyInvs.length,
    }
  }
  function getAllTaxYearStarts(): Date[] {
    const years = new Set<number>()
    for (const inv of invoices) {
      if (!inv.invoice_date) continue
      const d = new Date(inv.invoice_date)
      years.add(getTaxYearStart(d).getFullYear())
    }
    return Array.from(years).sort((a, b) => b - a).map(y => new Date(y, 3, 6))
  }

  // Invoice stats
  const todayStr2 = now.toISOString().split('T')[0]
  const unpaidInvoices = invoices.filter(i => i.status !== 'Paid' && i.status !== 'Void')
  const overdueInvoices = unpaidInvoices.filter(i => i.due_date && i.due_date < todayStr2)
  const currentTYStart = getTaxYearStart(now)
  const currentTY      = taxYearStats(currentTYStart)
  const currentTYLabel = taxYearLabel(currentTYStart)
  const allTaxYears    = getAllTaxYearStarts()
  const pastTaxYears   = allTaxYears.filter(y => y.getTime() !== currentTYStart.getTime())

  const ds = dogStats!

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* Today */}
      {(todayGuests.length > 0 || todayTasks.length > 0) && (
        <div className="bg-[#2d6a4f] text-white rounded-2xl p-5">
          <h2 className="font-bold text-lg mb-3">🐾 With You Today</h2>
          {todayGuests.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {todayGuests.map(e => (
                <Link
                  key={e.uid ?? e.dogName}
                  href={e.dogId ? `/dogs/${e.dogId}` : '#'}
                  className="bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-full text-sm font-medium"
                >
                  {e.visitType.startsWith('Boarding') ? '🌙' : '☀️'} {e.dogName}
                </Link>
              ))}
            </div>
          )}
          {todayTasks.length > 0 && (
            <div className={`${todayGuests.length > 0 ? 'mt-4 pt-4 border-t border-white/20' : ''}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-2">📋 Tasks Due Today</p>
              <div className="space-y-1.5">
                {todayTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-2 text-sm">
                    <span className="text-white/40 mt-0.5">•</span>
                    <div>
                      <span className="font-medium">{task.title}</span>
                      {task.listTitle && task.listTitle !== 'My Tasks' && (
                        <span className="text-white/50 text-xs ml-2">{task.listTitle}</span>
                      )}
                      {task.notes && <p className="text-white/60 text-xs mt-0.5">{task.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* This month */}
      <div>
        <h2 className="font-semibold text-gray-700 mb-3">This Month</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Boarding Nights" value={monthBoardingNights} color="purple" />
          <StatCard label="Daycare Days"    value={monthDaycareDays}    color="yellow" />
          <StatCard label="Trials"          value={monthTrials}         color="blue"   />
        </div>
      </div>

      {/* This tax year */}
      <div>
        <h2 className="font-semibold text-gray-700 mb-3">Tax Year {taxYearLabel(soyStart)}</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Boarding Nights" value={yearBoardingNights} color="purple" />
          <StatCard label="Daycare Days"    value={yearDaycareDays}    color="yellow" />
          <StatCard label="New Clients"     value={ds.newThisYear}     color="green"  />
        </div>
      </div>

      {/* Pending invoices nudge */}
      {pendingInvoiceCount > 0 && (
        <Link href="/invoices/bulk"
          className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 hover:bg-amber-100 transition-colors">
          <div>
            <p className="font-semibold text-amber-800">📤 {pendingInvoiceCount} booking{pendingInvoiceCount !== 1 ? 's' : ''} need{pendingInvoiceCount === 1 ? 's' : ''} invoicing</p>
            <p className="text-xs text-amber-600 mt-0.5">Upcoming confirmed bookings without an invoice</p>
          </div>
          <span className="text-amber-600 text-sm font-medium">Send Invoices →</span>
        </Link>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Invoices</h2>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {currentTYLabel} tax year
            </span>
          </div>

          {/* Current tax year stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatCard label="Invoiced" value={`£${currentTY.total.toFixed(0)}`} sub={`${currentTY.count} invoice${currentTY.count !== 1 ? 's' : ''}`} color="blue" />
            <StatCard label="Paid" value={`£${currentTY.paid.toFixed(0)}`} color="green" />
            <StatCard label="Outstanding" value={`£${currentTY.unpaid.toFixed(0)}`}
              sub={currentTY.unpaid > 0 ? `${currentTY.invoices.filter(i => i.status !== 'Paid').length} unpaid` : undefined}
              color={currentTY.unpaid > 0 ? 'red' : 'gray'} />
          </div>

          {/* Unpaid invoices */}
          {unpaidInvoices.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Unpaid Invoices {overdueInvoices.length > 0 && <span className="text-red-500 ml-1">({overdueInvoices.length} overdue)</span>}
              </p>
              <div className="space-y-1">
                {unpaidInvoices.sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')).map(inv => {
                  const isOverdue = inv.due_date && inv.due_date < todayStr2
                  return (
                    <Link key={inv.id} href={`/invoices/${inv.id}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs text-[#2d6a4f] font-semibold">#{inv.invoice_number}</span>
                        <span className="text-sm text-gray-700 truncate">{inv.dog_name || inv.client_name || '—'}</span>
                        {isOverdue && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">Overdue</span>}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {inv.due_date && <span className="text-xs text-gray-400">Due {new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                        <span className="text-sm font-semibold text-gray-800">£{inv.total.toFixed(2)}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tax year history */}
          {pastTaxYears.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Previous Tax Years</p>
              <div className="space-y-2">
                {pastTaxYears.map(yearStart => {
                  const stats = taxYearStats(yearStart)
                  const label = taxYearLabel(yearStart)
                  const paidPct = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 100
                  return (
                    <div key={label} className="rounded-xl border border-gray-100 px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">{label}</span>
                        <span className="text-xs text-gray-400">{stats.count} invoice{stats.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs mb-2">
                        <span className="text-gray-500">Invoiced <span className="font-semibold text-gray-800">£{stats.total.toFixed(0)}</span></span>
                        <span className="text-gray-500">Paid <span className="font-semibold text-green-600">£{stats.paid.toFixed(0)}</span></span>
                        {stats.unpaid > 0 && (
                          <span className="text-gray-500">Outstanding <span className="font-semibold text-red-500">£{stats.unpaid.toFixed(0)}</span></span>
                        )}
                      </div>
                      {/* Paid progress bar */}
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dogs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-4">Dogs ({ds.total})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="Total Dogs"    value={ds.total}        color="green"  href="/"      />
          <StatCard label="New This Month" value={ds.newThisMonth} color="blue"               />
          <StatCard label="No Photo"      value={ds.withoutPhoto} color="gray"   href="/"      />
          <StatCard label="No Vet Registered" value={ds.noVet}    color="gray"               />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Sex */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Sex</p>
            {Object.entries(ds.sexBreakdown).map(([k, v]) => (
              <MiniBar key={k} label={k} value={v} max={ds.total} />
            ))}
          </div>

          {/* Neutered */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Neutered</p>
            <MiniBar label="Neutered" value={ds.neuteredCount}   max={ds.total} />
            <MiniBar label="Intact"   value={ds.intactCount}     max={ds.total} />
            <MiniBar label="Unknown"  value={ds.unknownNeutered} max={ds.total} />
          </div>

          {/* Energy */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Energy Level</p>
            {Object.entries(ds.energyBreakdown).sort((a,b) => b[1]-a[1]).map(([k, v]) => (
              <MiniBar key={k} label={k} value={v} max={ds.total} />
            ))}
          </div>

          {/* Top breeds */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Top Breeds</p>
            {ds.topBreeds.map(([breed, count]) => (
              <MiniBar key={breed} label={breed} value={count} max={ds.topBreeds[0]?.[1] ?? 1} />
            ))}
          </div>
        </div>
      </div>

      {/* Bookings over time */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="font-semibold text-gray-700">Bookings — Last 12 Months</h2>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-400 inline-block" /> Boarding</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-300 inline-block" /> Daycare</span>
            <span className="flex items-center gap-1"><span className="font-semibold text-green-600">£</span> Income</span>
          </div>
        </div>
        {Object.entries(monthData).map(([month, { boarding, daycare, income }]) => (
          <MonthBar key={month} month={month} boarding={boarding} daycare={daycare} income={income} max={maxMonthTotal} />
        ))}
      </div>

      {/* Top guests */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-4">Most Frequent Guests</h2>
        <div className="space-y-1">
          {topGuests.map(([name, { count, dogId }]) => (
            <div key={name} className="flex items-center gap-2 py-1">
              <span className="text-xs text-gray-600 w-24 truncate flex-shrink-0">
                {dogId ? <Link href={`/dogs/${dogId}`} className="hover:text-[#2d6a4f] hover:underline">{name}</Link> : name}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-[#2d6a4f] h-2 rounded-full" style={{ width: `${Math.round(count / maxGuest * 100)}%` }} />
              </div>
              <span className="text-xs font-semibold text-gray-700 w-8 text-right">{count} visits</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
