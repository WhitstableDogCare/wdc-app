'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pill } from './ui'

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

function DogCard({ dog, dimmed = false }: { dog: Dog; dimmed?: boolean }) {
  return (
    <Link
      href={`/dogs/${dog.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-2)',
        borderRadius: 'var(--density-radius-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--sh-sm)',
        overflow: 'hidden',
        opacity: dimmed ? 0.55 : 1,
        filter: dimmed ? 'grayscale(0.6)' : 'none',
        transition: 'box-shadow 150ms, border-color 150ms',
      }}
    >
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {dog.medical_requirements && !['none', 'n/a'].includes(dog.medical_requirements.trim().toLowerCase()) && (
            <Pill color="amber">Medical</Pill>
          )}
          {dog.off_lead === 'Yes'            && <Pill color="green">Off-lead</Pill>}
          {dog.off_lead === 'Working on it'  && <Pill color="gold">Lead training</Pill>}
          {dog.off_lead === 'No'             && <Pill color="red">On-lead</Pill>}
          {dog.is_solo && <Pill color="amber">Solo</Pill>}
        </div>
      </div>
    </Link>
  )
}

export default function DogList({ dogs, archivedDogs }: { dogs: Dog[]; archivedDogs: Dog[] }) {
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const filter = (list: Dog[]) => {
    const q = search.toLowerCase()
    if (!q) return list
    return list.filter(dog =>
      dog.name.toLowerCase().includes(q) ||
      dog.owners.some(o => o.name?.toLowerCase().includes(q))
    )
  }

  const filtered = filter(dogs)
  const filteredArchived = filter(archivedDogs)

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <input
          type="search"
          placeholder="Search by dog name or owner…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 400 }}
        />
      </div>

      {filtered.length === 0 && !showArchived ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
          {search ? `No dogs found matching "${search}"` : 'No dogs yet. Add your first dog!'}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {filtered.map(dog => <DogCard key={dog.id} dog={dog} />)}
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
                  {filteredArchived.map(dog => <DogCard key={dog.id} dog={dog} dimmed />)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}
