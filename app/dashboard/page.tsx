'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHead, Card, Pill, StatTile } from '../components/ui'

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

function MiniBar({ label, value, max, href }: { label: string; value: number; max: number; href?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const labelEl = href
    ? <Link href={href} style={{ color: 'var(--cta-purple)' }}>{label}</Link>
    : <span>{label}</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {labelEl}
      </span>
      <div style={{ flex: 1, background: 'var(--tint-neutral)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
        <div style={{ background: 'var(--cta-purple)', height: 6, borderRadius: 4, width: `${pct}%`, transition: 'width 400ms ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', width: 24, textAlign: 'right', flexShrink: 0 }}>{value}</span>
    </div>
  )
}

function MonthBar({ month, boarding, daycare, income, max }: { month: string; boarding: number; daycare: number; income: number; max: number }) {
  const total = boarding + daycare
  const pct = max > 0 ? Math.round((total / max) * 100) : 0
  const incomeLabel = income >= 1000 ? `£${(income / 1000).toFixed(1)}k` : income > 0 ? `£${Math.round(income)}` : ''
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
      <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 36, flexShrink: 0 }}>{month}</span>
      <div style={{ flex: 1, background: 'var(--tint-neutral)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
        <div style={{ height: 10, display: 'flex', width: `${pct}%` }}>
          <div style={{ background: 'var(--purple)', height: '100%', width: boarding + daycare > 0 ? `${Math.round(boarding / total * 100)}%` : '0' }} />
          <div style={{ background: 'var(--gold)', height: '100%', width: boarding + daycare > 0 ? `${Math.round(daycare / total * 100)}%` : '0' }} />
        </div>
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 20, textAlign: 'right', flexShrink: 0 }}>{total || ''}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tint-green-text)', width: 52, textAlign: 'right', flexShrink: 0 }}>{incomeLabel}</span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 8, marginTop: 0 }}>
      {children}
    </p>
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)' }}>
        Loading dashboard…
      </div>
    )
  }

  const now      = new Date()
  const somStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const somEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const soyStart = getTaxYearStart(now)
  const soyEnd   = getTaxYearEnd(soyStart)

  const pastEvents = events.filter(e => new Date(e.end) < now)

  const monthEvents = events.filter(e => isInPeriod(e.start, e.end, somStart, somEnd))
  const monthBoardingNights = monthEvents.filter(e => e.visitType === 'Boarding').reduce((s, e) => s + nightsBetween(e.start, e.end), 0)
  const monthDaycareDays    = monthEvents.filter(e => e.visitType === 'Daycare').reduce((s, e) => s + Math.max(1, nightsBetween(e.start, e.end)), 0)
  const monthTrials         = monthEvents.filter(e => e.visitType.includes('Trial')).length

  const yearEvents = events.filter(e => isInPeriod(e.start, e.end, soyStart, soyEnd))
  const yearBoardingNights = yearEvents.filter(e => e.visitType === 'Boarding').reduce((s, e) => s + nightsBetween(e.start, e.end), 0)
  const yearDaycareDays    = yearEvents.filter(e => e.visitType === 'Daycare').reduce((s, e) => s + Math.max(1, nightsBetween(e.start, e.end)), 0)

  const todayStr = now.toISOString().split('T')[0]
  const calToday = events.filter(e => e.start.split('T')[0] <= todayStr && e.end.split('T')[0] >= todayStr)
  const calNames = new Set(calToday.map(e => e.dogName.toLowerCase()))
  const bookingOnlyToday = todayBookings.filter(b => !calNames.has(b.dogName.toLowerCase()))
  const todayGuests: { uid?: string; dogName: string; dogId: number | null; visitType: VisitType }[] = [
    ...calToday,
    ...bookingOnlyToday,
  ]

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

  const guestMap: Record<string, { count: number; dogId: number | null }> = {}
  for (const e of pastEvents) {
    if (!guestMap[e.dogName]) guestMap[e.dogName] = { count: 0, dogId: e.dogId }
    guestMap[e.dogName].count++
  }
  const topGuests = Object.entries(guestMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
  const maxGuest = topGuests[0]?.[1].count ?? 1

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

  const todayStr2 = now.toISOString().split('T')[0]
  const unpaidInvoices = invoices.filter(i => i.status !== 'Paid' && i.status !== 'Void')
  const overdueInvoices = unpaidInvoices.filter(i => i.due_date && i.due_date < todayStr2)
  const currentTYStart = getTaxYearStart(now)
  const currentTY      = taxYearStats(currentTYStart)
  const currentTYLabel = taxYearLabel(currentTYStart)
  const allTaxYears    = getAllTaxYearStarts()
  const pastTaxYears   = allTaxYears.filter(y => y.getTime() !== currentTYStart.getTime())

  const ds = dogStats!

  const monthName = now.toLocaleDateString('en-GB', { month: 'long' })

  return (
    <div style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHead title="Dashboard" eyebrow="Whitstable Dog Care" />

      {/* Today hero card */}
      {(todayGuests.length > 0 || todayTasks.length > 0) && (
        <div style={{
          background: 'var(--gold)',
          borderRadius: 'var(--density-radius-card)',
          padding: '20px 22px',
          boxShadow: 'var(--sh-md)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Botanical decoration */}
          <img
            src="/botanical-paw.png"
            alt=""
            aria-hidden="true"
            style={{ position: 'absolute', right: -10, bottom: -10, width: 100, opacity: 0.18, pointerEvents: 'none' }}
          />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 12px' }}>
            With You Today
          </h2>
          {todayGuests.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {todayGuests.map(e => (
                <Link
                  key={e.uid ?? e.dogName}
                  href={e.dogId ? `/dogs/${e.dogId}` : '#'}
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    borderRadius: 50,
                    padding: '6px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--charcoal)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'var(--font-label)',
                    letterSpacing: '0.04em',
                  }}
                >
                  <span style={{ fontSize: 10, opacity: 0.7 }}>
                    {e.visitType.startsWith('Boarding') ? 'BOARDING' : 'DAYCARE'}
                  </span>
                  {e.dogName}
                </Link>
              ))}
            </div>
          )}
          {todayTasks.length > 0 && (
            <div style={{ marginTop: todayGuests.length > 0 ? 16 : 0 }}>
              <p style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10.5, color: 'rgba(61,61,61,0.6)', marginBottom: 8 }}>
                Tasks Due Today
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {todayTasks.map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
                    <span style={{ color: 'rgba(61,61,61,0.4)', marginTop: 2 }}>•</span>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--charcoal)' }}>{task.title}</span>
                      {task.listTitle && task.listTitle !== 'My Tasks' && (
                        <span style={{ color: 'rgba(61,61,61,0.5)', fontSize: 11, marginLeft: 8 }}>{task.listTitle}</span>
                      )}
                      {task.notes && <p style={{ color: 'rgba(61,61,61,0.6)', fontSize: 11, marginTop: 2 }}>{task.notes}</p>}
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
        <SectionLabel>{monthName} — this month</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <StatTile value={monthBoardingNights} label="Boarding Nights" tint="purple" />
          <StatTile value={monthDaycareDays}    label="Daycare Days"    tint="gold"   />
          <StatTile value={monthTrials}         label="Trials"          tint="blue"   />
        </div>
      </div>

      {/* This tax year */}
      <div>
        <SectionLabel>Tax Year {taxYearLabel(soyStart)}</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <StatTile value={yearBoardingNights} label="Boarding Nights" tint="purple" />
          <StatTile value={yearDaycareDays}    label="Daycare Days"    tint="gold"   />
          <StatTile value={ds.newThisYear}     label="New Clients"     tint="green"  />
        </div>
      </div>

      {/* Pending invoices nudge */}
      {pendingInvoiceCount > 0 && (
        <Link href="/invoices/bulk"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--tint-amber)', borderRadius: 'var(--density-radius-card)',
            padding: '14px 18px', border: '1px solid var(--tint-amber-text)',
          }}>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--tint-amber-text)', margin: 0, fontSize: 14 }}>
              {pendingInvoiceCount} booking{pendingInvoiceCount !== 1 ? 's' : ''} need{pendingInvoiceCount === 1 ? 's' : ''} invoicing
            </p>
            <p style={{ fontSize: 12, color: 'var(--tint-amber-text)', opacity: 0.8, marginTop: 2 }}>Upcoming confirmed bookings without an invoice</p>
          </div>
          <span style={{ fontFamily: 'var(--font-label)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--tint-amber-text)', fontWeight: 600 }}>
            Send Invoices →
          </span>
        </Link>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Invoices</h2>
            <Pill color="neutral">{currentTYLabel} tax year</Pill>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            <StatTile value={`£${currentTY.total.toFixed(0)}`} label="Invoiced" sub={`${currentTY.count} invoice${currentTY.count !== 1 ? 's' : ''}`} tint="blue" />
            <StatTile value={`£${currentTY.paid.toFixed(0)}`}  label="Paid"     tint="green" />
            <StatTile value={`£${currentTY.unpaid.toFixed(0)}`} label="Outstanding"
              sub={currentTY.unpaid > 0 ? `${currentTY.invoices.filter(i => i.status !== 'Paid').length} unpaid` : undefined}
              tint={currentTY.unpaid > 0 ? 'red' : 'neutral'} />
          </div>

          {unpaidInvoices.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <SectionLabel>
                Unpaid Invoices
                {overdueInvoices.length > 0 && (
                  <span style={{ color: 'var(--tint-red-text)', marginLeft: 6 }}>({overdueInvoices.length} overdue)</span>
                )}
              </SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {unpaidInvoices.sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')).map(inv => {
                  const isOverdue = inv.due_date && inv.due_date < todayStr2
                  return (
                    <Link key={inv.id} href={`/invoices/${inv.id}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, transition: 'background 120ms' }}
                      className="hover-row"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span style={{ fontFamily: 'var(--font-label)', fontSize: 11, color: 'var(--cta-purple)', fontWeight: 600, letterSpacing: '0.04em', flexShrink: 0 }}>
                          #{inv.invoice_number}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inv.dog_name || inv.client_name || '—'}
                        </span>
                        {isOverdue && <Pill color="red">Overdue</Pill>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {inv.due_date && (
                          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                            Due {new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>£{inv.total.toFixed(2)}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {pastTaxYears.length > 0 && (
            <div>
              <SectionLabel>Previous Tax Years</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pastTaxYears.map(yearStart => {
                  const stats = taxYearStats(yearStart)
                  const label = taxYearLabel(yearStart)
                  const paidPct = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 100
                  return (
                    <div key={label} style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{stats.count} invoice{stats.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Invoiced <strong style={{ color: 'var(--text)' }}>£{stats.total.toFixed(0)}</strong></span>
                        <span style={{ color: 'var(--text-muted)' }}>Paid <strong style={{ color: 'var(--tint-green-text)' }}>£{stats.paid.toFixed(0)}</strong></span>
                        {stats.unpaid > 0 && (
                          <span style={{ color: 'var(--text-muted)' }}>Outstanding <strong style={{ color: 'var(--tint-red-text)' }}>£{stats.unpaid.toFixed(0)}</strong></span>
                        )}
                      </div>
                      <div style={{ height: 4, background: 'var(--tint-neutral)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: 4, background: 'var(--status-available)', borderRadius: 4, width: `${paidPct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Dogs */}
      <Card>
        <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Dogs ({ds.total})</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
          <StatTile value={ds.total}        label="Total Dogs"     tint="green"  href="/"  />
          <StatTile value={ds.newThisMonth} label="New This Month" tint="blue"             />
          <StatTile value={ds.withoutPhoto} label="No Photo"       tint="neutral" href="/" />
          <StatTile value={ds.noVet}        label="No Vet Registered" tint="neutral"       />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          <div>
            <SectionLabel>Sex</SectionLabel>
            {Object.entries(ds.sexBreakdown).map(([k, v]) => (
              <MiniBar key={k} label={k} value={v} max={ds.total} />
            ))}
          </div>
          <div>
            <SectionLabel>Neutered</SectionLabel>
            <MiniBar label="Neutered" value={ds.neuteredCount}   max={ds.total} />
            <MiniBar label="Intact"   value={ds.intactCount}     max={ds.total} />
            <MiniBar label="Unknown"  value={ds.unknownNeutered} max={ds.total} />
          </div>
          <div>
            <SectionLabel>Energy Level</SectionLabel>
            {Object.entries(ds.energyBreakdown).sort((a,b) => b[1]-a[1]).map(([k, v]) => (
              <MiniBar key={k} label={k} value={v} max={ds.total} />
            ))}
          </div>
          <div>
            <SectionLabel>Top Breeds</SectionLabel>
            {ds.topBreeds.map(([breed, count]) => (
              <MiniBar key={breed} label={breed} value={count} max={ds.topBreeds[0]?.[1] ?? 1} />
            ))}
          </div>
        </div>
      </Card>

      {/* Bookings over time */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Bookings — Last 12 Months</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--purple)', display: 'inline-block' }} />
              Boarding
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--gold)', display: 'inline-block' }} />
              Daycare
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <strong style={{ color: 'var(--tint-green-text)' }}>£</strong>
              Income
            </span>
          </div>
        </div>
        {Object.entries(monthData).map(([month, { boarding, daycare, income }]) => (
          <MonthBar key={month} month={month} boarding={boarding} daycare={daycare} income={income} max={maxMonthTotal} />
        ))}
      </Card>

      {/* Top guests */}
      <Card>
        <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Most Frequent Guests</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {topGuests.map(([name, { count, dogId }]) => (
            <MiniBar key={name} label={name} value={count} max={maxGuest} href={dogId ? `/dogs/${dogId}` : undefined} />
          ))}
        </div>
      </Card>

      <style>{`
        .hover-row:hover { background: var(--surface-app); }
      `}</style>
    </div>
  )
}
