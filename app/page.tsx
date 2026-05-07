'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHead, Btn, Pill } from './components/ui'

interface Owner {
  name: string | null
}

interface Dog {
  id: number
  name: string
  breed: string | null
  photo_path: string | null
  off_lead: string | null
  medical_requirements: string | null
  archived: boolean
  is_solo: boolean
  owners: Owner[]
}

type VisitType = 'Boarding' | 'Daycare' | 'Boarding Trial' | 'Daycare Trial'

interface CalendarEvent {
  dogId: number | null
  dogName: string
  visitType: VisitType
  start: string
  end: string
}

function isToday(start: string, end: string) {
  const now = new Date()
  return new Date(start) <= now && new Date(end) >= now
}

interface TrialSummary {
  daycareEligible: boolean
  boardingEligible: boolean
  daycareFailed: boolean
  boardingFailed: boolean
}

function DogCard({ dog, dimmed = false, visitType, trial }: {
  dog: Dog
  dimmed?: boolean
  visitType?: VisitType
  trial?: TrialSummary
}) {
  const isHere = Boolean(visitType)
  const isBoarding = visitType?.startsWith('Boarding')

  return (
    <Link
      href={`/dogs/${dog.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-2)',
        borderRadius: 'var(--density-radius-card)',
        border: `1px solid ${isHere ? 'var(--cta-purple)' : 'var(--border)'}`,
        boxShadow: isHere ? 'var(--sh-md)' : 'var(--sh-sm)',
        overflow: 'hidden',
        opacity: dimmed ? 0.55 : 1,
        filter: dimmed ? 'grayscale(0.6)' : 'none',
        transition: 'box-shadow 150ms, border-color 150ms',
      }}
    >
      {/* Photo area */}
      <div style={{ aspectRatio: '1', background: 'var(--tint-neutral)', position: 'relative', overflow: 'hidden' }}>
        {dog.photo_path ? (
          <img src={dog.photo_path} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2 .336-3.5 2.098-3.5 4 0 .801.07 1.6.14 2.4C3 11.5 3 13 3 13.5c0 2.5 2 4.5 4.5 4.5S12 16 12 13.5c0-.5.14-1.94.14-1.94"/>
              <path d="M14.836 5C14.836 3.67 16.165 2.62 17.836 3c1.78.397 2.996 2.098 2.996 4 0 .758-.07 1.486-.14 2.2l.144.3"/>
              <circle cx="17" cy="15" r="2.5"/>
              <path d="M14.5 13.5v-2"/>
            </svg>
          </div>
        )}
        {isHere && (
          <span style={{
            position: 'absolute', top: 8, right: 8,
            background: isBoarding ? 'var(--tint-purple)' : 'var(--tint-gold)',
            color: isBoarding ? 'var(--tint-purple-text)' : 'var(--tint-gold-text)',
            fontFamily: 'var(--font-label)', fontSize: 10, letterSpacing: '0.06em', fontWeight: 600,
            padding: '3px 7px', borderRadius: 50,
          }}>
            {isBoarding ? 'BOARDING' : 'DAYCARE'}
          </span>
        )}
        {dimmed && (
          <span style={{
            position: 'absolute', top: 8, left: 8,
            background: 'var(--tint-neutral)', color: 'var(--tint-neutral-text)',
            fontFamily: 'var(--font-label)', fontSize: 10, letterSpacing: '0.06em', fontWeight: 600,
            padding: '3px 7px', borderRadius: 50,
          }}>
            ARCHIVED
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <h2 style={{ fontFamily: 'var(--font-label)', fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {dog.name}
        </h2>
        {dog.breed && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {dog.breed}
          </p>
        )}
        {dog.owners[0]?.name && (
          <p style={{ fontSize: 11, color: 'var(--cta-purple)', margin: 0, fontFamily: 'var(--font-label)', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {dog.owners[0].name}
          </p>
        )}

        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {dog.medical_requirements && !['none', 'n/a'].includes(dog.medical_requirements.trim().toLowerCase()) && (
            <Pill color="amber">Medical</Pill>
          )}
          {dog.off_lead === 'Yes'           && <Pill color="green">Off-lead</Pill>}
          {dog.off_lead === 'Working on it' && <Pill color="gold">Lead training</Pill>}
          {dog.off_lead === 'No'            && <Pill color="red">On-lead</Pill>}
          {dog.is_solo && <Pill color="amber">Solo</Pill>}
          {trial?.boardingEligible && <Pill color="purple">Boarding</Pill>}
          {trial?.daycareEligible  && <Pill color="gold">Daycare</Pill>}
          {!trial?.boardingEligible && trial?.boardingFailed && <Pill color="red">No boarding</Pill>}
          {!trial?.daycareEligible  && trial?.daycareFailed  && <Pill color="red">No daycare</Pill>}
          {!trial && <Pill color="neutral">No trial</Pill>}
        </div>
      </div>
    </Link>
  )
}

export default function HomePage() {
  const [dogs, setDogs] = useState<Dog[]>([])
  const [archivedDogs, setArchivedDogs] = useState<Dog[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [todayMap, setTodayMap] = useState<Record<number, VisitType>>({})
  const [trialMap, setTrialMap] = useState<Record<number, TrialSummary>>({})

  useEffect(() => {
    Promise.all([
      fetch('/api/dogs').then(r => r.json()),
      fetch('/api/dogs?includeArchived=true').then(r => r.json()),
    ]).then(([active, all]) => {
      setDogs(Array.isArray(active) ? active : [])
      const archived = Array.isArray(all) ? all.filter((d: Dog) => d.archived) : []
      setArchivedDogs(archived)
      setLoading(false)
    }).catch(() => setLoading(false))

    fetch('/api/calendar')
      .then((r) => r.json())
      .then((events: CalendarEvent[]) => {
        if (!Array.isArray(events)) return
        const map: Record<number, VisitType> = {}
        for (const e of events) {
          if (e.dogId && isToday(e.start, e.end)) {
            map[e.dogId] = e.visitType
          }
        }
        setTodayMap(map)
      })
      .catch(() => {})

    fetch('/api/dogs/trials-summary')
      .then((r) => r.json())
      .then((data) => setTrialMap(data))
      .catch(() => {})
  }, [])

  const filterDogs = (list: Dog[]) => {
    const q = search.toLowerCase()
    if (!q) return list
    return list.filter(dog =>
      dog.name.toLowerCase().includes(q) ||
      dog.owners.some(o => o.name?.toLowerCase().includes(q))
    )
  }

  const filtered = filterDogs(dogs)
  const filteredArchived = filterDogs(archivedDogs)

  return (
    <div>
      <PageHead title="Dog Profiles" sub={loading ? undefined : `${dogs.length} active dog${dogs.length !== 1 ? 's' : ''}`}>
        <Btn href="/dogs/new" variant="primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Dog
        </Btn>
      </PageHead>

      <div style={{ marginBottom: 20 }}>
        <input
          type="search"
          placeholder="Search by dog name or owner…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 400 }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Loading dogs…</div>
      ) : filtered.length === 0 && !showArchived ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
          {search ? `No dogs found matching "${search}"` : 'No dogs yet. Add your first dog!'}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {filtered.map(dog => (
              <DogCard key={dog.id} dog={dog} visitType={todayMap[dog.id]} trial={trialMap[dog.id]} />
            ))}
          </div>

          {archivedDogs.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <button
                onClick={() => setShowArchived(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-label)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                <span>{showArchived ? '▼' : '▶'}</span>
                {showArchived ? 'Hide' : 'Show'} archived ({archivedDogs.length})
              </button>

              {showArchived && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginTop: 14 }}>
                  {filteredArchived.map(dog => (
                    <DogCard key={dog.id} dog={dog} dimmed visitType={todayMap[dog.id]} trial={trialMap[dog.id]} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
