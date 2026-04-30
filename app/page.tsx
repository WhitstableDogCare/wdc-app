'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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

  function DogCard({ dog, dimmed = false }: { dog: Dog; dimmed?: boolean }) {
    const visitType = todayMap[dog.id]
    const isHere    = Boolean(visitType)
    const trial     = trialMap[dog.id]
    return (
      <Link
        href={`/dogs/${dog.id}`}
        className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all ${dimmed ? 'opacity-50 grayscale' : ''} ${isHere ? 'border-[#2d6a4f] ring-2 ring-[#2d6a4f]/20' : 'border-gray-100 hover:border-[#2d6a4f]/30'}`}
      >
        <div className="aspect-square bg-gray-100 relative">
          {dog.photo_path ? (
            <img src={dog.photo_path} alt={dog.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">🐕</div>
          )}
          {isHere && (
            <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${visitType?.startsWith('Boarding') ? 'bg-purple-600 text-white' : 'bg-yellow-400 text-yellow-900'}`}>
              {visitType?.startsWith('Boarding') ? '🌙' : '☀️'} {visitType}
            </span>
          )}
          {dimmed && (
            <span className="absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-white">Archived</span>
          )}
        </div>
        <div className="p-3">
          <h2 className="font-bold text-gray-800 truncate">{dog.name}</h2>
          {dog.breed && <p className="text-xs text-gray-500 truncate mt-0.5">{dog.breed}</p>}
          {dog.owners[0]?.name && <p className="text-xs text-[#2d6a4f] truncate mt-1">{dog.owners[0].name}</p>}
          {dog.medical_requirements && !['none', 'n/a'].includes(dog.medical_requirements.trim().toLowerCase()) && (
            <div className="mt-1.5">
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-orange-100 text-orange-700">💊 Medical needs</span>
            </div>
          )}
          {dog.off_lead && (
            <div className="mt-1.5">
              {dog.off_lead === 'Yes'           && <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-green-100 text-green-700">🟢 Off-lead</span>}
              {dog.off_lead === 'Working on it' && <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-yellow-100 text-yellow-700">🟡 Lead training</span>}
              {dog.off_lead === 'No'            && <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-red-100 text-red-600">🔴 On-lead</span>}
            </div>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            {dog.is_solo && <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-700">🐶 Solo</span>}
            {trial?.boardingEligible && <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-purple-100 text-purple-700">✓ Boarding</span>}
            {trial?.daycareEligible  && <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-yellow-100 text-yellow-700">✓ Daycare</span>}
            {!trial?.boardingEligible && trial?.boardingFailed && <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-red-100 text-red-600">✗ Boarding</span>}
            {!trial?.daycareEligible  && trial?.daycareFailed  && <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-red-100 text-red-600">✗ Daycare</span>}
            {!trial && <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-400">No trial</span>}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dog Profiles</h1>
        <Link
          href="/dogs/new"
          className="inline-flex items-center gap-2 bg-[#2d6a4f] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#245a41] transition-colors text-sm"
        >
          <span>+</span> Add Dog
        </Link>
      </div>

      <div className="mb-6">
        <input
          type="search"
          placeholder="Search by dog name or owner name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] focus:border-transparent text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-500">Loading dogs...</div>
      ) : filtered.length === 0 && !showArchived ? (
        <div className="text-center py-16 text-gray-500">
          {search ? `No dogs found matching "${search}"` : 'No dogs yet. Add your first dog!'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(dog => <DogCard key={dog.id} dog={dog} />)}
          </div>

          {/* Archived toggle */}
          {archivedDogs.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowArchived(v => !v)}
                className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors flex items-center gap-1.5"
              >
                <span>{showArchived ? '▼' : '▶'}</span>
                {showArchived ? 'Hide' : 'Show'} archived ({archivedDogs.length})
              </button>

              {showArchived && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                  {filteredArchived.map(dog => <DogCard key={dog.id} dog={dog} dimmed />)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
