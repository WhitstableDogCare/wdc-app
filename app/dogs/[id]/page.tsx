'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Owner { id: number; name: string | null; phone: string | null; emergency_phone: string | null; address: string | null; email: string | null }
interface Vet { id: number; name: string | null; phone: string | null; emergency_phone: string | null; address: string | null; email: string | null }
interface Buddy { id: number; name: string | null; phone: string | null; emergency_phone: string | null; address: string | null; email: string | null; is_primary: boolean }

interface Dog {
  id: number
  name: string
  breed: string | null
  age: number | null
  birth_date: string | null
  sex: string | null
  neutered: boolean | null
  microchip_number: string | null
  photo_path: string | null
  gets_along_with_cats: string | null
  good_with_children: string | null
  energy_level: string | null
  special_behaviours: string | null
  feeding_schedule: string | null
  food_type: string | null
  portion_size: string | null
  treats_allowed: string | null
  exercise_needs: string | null
  off_lead: string | null
  favourite_activities: string | null
  sleeping_arrangements: string | null
  dog_commands: string | null
  food_and_treats: string | null
  dietary_requirements: string | null
  medical_requirements: string | null
  vaccination_date: string | null
  flea_worm_date: string | null
  consent_daily_activities: string | null
  concerns_daily_activities: string | null
  consent_social_media: string | null
  consent_communication: string | null
  equipment_provided: string | null
  equipment_wdc: string | null
  notes: string | null
  is_solo: boolean
  archived: boolean
  owners: Owner[]
  vets: Vet[]
  buddies: Buddy[]
}

const TABS = ['Profile', 'Contacts & Notes', 'Bookings & Trials', 'Invoices', 'Incidents']

interface TrialReview {
  id: number
  trial_type: string
  outcome: string
  start_datetime: string | null
  end_datetime: string | null
  dogs_mixed_with: string | null
  completed_by: string | null
  log_date: string | null
  behaviour_notes: string | null
  toileting_notes: string | null
  appetite_notes: string | null
  sleeping_notes: string | null
  walks_notes: string | null
  health_notes: string | null
  actions_notes: string | null
  created_at: string
}

type TrialSectionKey = 'behaviour_notes' | 'toileting_notes' | 'appetite_notes' | 'sleeping_notes' | 'walks_notes' | 'health_notes' | 'actions_notes'
type TrialSection = { key: TrialSectionKey; label: string; sub: string; hints: string[]; boardingOnly?: boolean }

const TRIAL_SECTIONS: TrialSection[] = [
  { key: 'behaviour_notes', label: 'Behaviour', sub: 'Energy, mood, interactions with others', hints: ['Friendly / Reserved / Anxious / Reactive?', 'How were they when their owner left?', 'Did they bark/whine or pace?', 'Any destructive behaviours or chewing?', 'Did they settle at all?', 'How were they with Jack and/or Kim?', 'How were they with the other dogs?', 'Did they meet the children? If so, how were they?', 'Did they meet the cat?', 'What helped them be calm and/or settle?'] },
  { key: 'toileting_notes', label: 'Toileting', sub: 'Consistency / Frequency', hints: ['How many wees?', 'Did they do much scenting/marking?', 'What was the frequency and consistency of their poos?', 'Did they toilet before bedtime?', 'Did they toilet inside through the night?'] },
  { key: 'appetite_notes', label: 'Appetite & Hydration', sub: 'Amount / Frequency', hints: ['Did they eat and drink ok?', 'Did they accept treats?', 'Did they refuse their meal?'] },
  { key: 'sleeping_notes', label: 'Sleeping', sub: 'Mood / Behaviour / Sleep quality', hints: ['Did they settle ok for bedtime?', 'Where did they sleep?', 'Were they calm or anxious?', 'Did they bark, whine, cry or howl during the night?', 'How did they sleep?'], boardingOnly: true },
  { key: 'walks_notes', label: 'Walks', sub: 'Morning / Afternoon / Long line? / Off lead?', hints: ['Did they enjoy their walk?', 'How were they with other dogs?', 'Did they have a toy or ball on the walk?', 'How responsive to commands are they?', 'What is their recall like?'] },
  { key: 'health_notes', label: 'Health', sub: 'Coughing, limping, skin issues etc.', hints: ['Did they experience any health concerns?', 'Any coughing or sneezing?', 'Scratching or biting themselves?', 'Any limping or noticeable discomfort/pain?', 'Did they suffer any injuries or accidents?'] },
  { key: 'actions_notes', label: 'Actions / Next Steps', sub: '', hints: ['Did we need to contact the owner during the trial?', 'Are there any actions needed in order to agree to further care?', 'Any recommendations to the owner about their dog\'s needs and future care at Whitstable Dog Care?'] },
]


function outcomeStyle(outcome: string) {
  if (outcome === 'Passed') return 'bg-green-100 text-green-700'
  if (outcome === 'Failed') return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-700'
}

function outcomeIcon(outcome: string) {
  if (outcome === 'Passed') return '✅'
  if (outcome === 'Failed') return '❌'
  return '⏳'
}

function TrialEligibilityBadges({ trials }: { trials: TrialReview[] }) {
  const passedBoarding = trials.some(t => t.trial_type === 'Boarding' && t.outcome === 'Passed')
  const passedAny      = trials.some(t => t.outcome === 'Passed')
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${passedAny ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {passedAny ? '✅' : '❌'} Daycare eligible
      </span>
      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${passedBoarding ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {passedBoarding ? '✅' : '❌'} Boarding eligible
      </span>
    </div>
  )
}

function TrialForm({ dogId, initial, onSave, onCancel }: {
  dogId: number
  initial?: TrialReview
  onSave: (t: TrialReview) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    trial_type:      initial?.trial_type      ?? 'Boarding',
    outcome:         initial?.outcome         ?? 'Pending',
    start_datetime:  initial?.start_datetime  ?? '',
    end_datetime:    initial?.end_datetime    ?? '',
    dogs_mixed_with: initial?.dogs_mixed_with ?? '',
    completed_by:    initial?.completed_by    ?? '',
    log_date:        initial?.log_date        ?? '',
    behaviour_notes: initial?.behaviour_notes ?? '',
    toileting_notes: initial?.toileting_notes ?? '',
    appetite_notes:  initial?.appetite_notes  ?? '',
    sleeping_notes:  initial?.sleeping_notes  ?? '',
    walks_notes:     initial?.walks_notes     ?? '',
    health_notes:    initial?.health_notes    ?? '',
    actions_notes:   initial?.actions_notes   ?? '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    const url     = initial ? `/api/dogs/${dogId}/trials/${initial.id}` : `/api/dogs/${dogId}/trials`
    const method  = initial ? 'PUT' : 'POST'
    const res     = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const saved   = await res.json()
    setSaving(false)
    onSave(saved)
  }

  const sections = TRIAL_SECTIONS.filter(s => !s.boardingOnly || form.trial_type === 'Boarding')

  return (
    <div className="space-y-5">
      {/* Header fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Trial Type</label>
          <select value={form.trial_type} onChange={e => set('trial_type', e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]">
            <option>Boarding</option>
            <option>Daycare</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Outcome</label>
          <select value={form.outcome} onChange={e => set('outcome', e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]">
            <option>Pending</option>
            <option>Passed</option>
            <option>Failed</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start Date & Time</label>
          <input type="datetime-local" value={form.start_datetime} onChange={e => set('start_datetime', e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">End Date & Time</label>
          <input type="datetime-local" value={form.end_datetime} onChange={e => set('end_datetime', e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dogs Mixed With</label>
          <input type="text" value={form.dogs_mixed_with} onChange={e => set('dogs_mixed_with', e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Completed By</label>
          <select value={form.completed_by} onChange={e => set('completed_by', e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white">
            <option value="">— Select —</option>
            <option>Jack Rojas Powell</option>
            <option>Kim Rojas Powell</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Log Date</label>
          <input type="date" value={form.log_date} onChange={e => set('log_date', e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
        </div>
      </div>

      {/* Observation sections */}
      {sections.map(s => (
        <div key={s.key}>
          <label className="text-sm font-semibold text-gray-700">{s.label}</label>
          {s.sub && <p className="text-xs text-gray-400 mb-1">{s.sub}</p>}
          <ul className="text-xs text-gray-400 mb-2 space-y-0.5 list-disc list-inside">
            {s.hints.map(h => <li key={h}>{h}</li>)}
          </ul>
          <textarea
            rows={4}
            value={form[s.key as TrialSectionKey]}
            onChange={e => set(s.key, e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none"
            placeholder={`Notes on ${s.label.toLowerCase()}...`}
          />
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} disabled={saving} className="bg-[#2d6a4f] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#245a41] disabled:opacity-60">
          {saving ? 'Saving...' : 'Save Trial Review'}
        </button>
        <button onClick={onCancel} className="px-5 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  )
}

function TrialCard({ trial, onEdit, onDelete }: { trial: TrialReview; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const sections = TRIAL_SECTIONS.filter(s => !s.boardingOnly || trial.trial_type === 'Boarding')
  const hasSectionNotes = sections.some(s => trial[s.key as TrialSectionKey])

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${outcomeStyle(trial.outcome)}`}>
            {outcomeIcon(trial.outcome)} {trial.outcome}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800">{trial.trial_type} Trial</p>
            {trial.start_datetime && (
              <p className="text-xs text-gray-500">
                {new Date(trial.start_datetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {trial.completed_by && ` · ${trial.completed_by}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); onEdit() }} className="text-xs text-gray-400 hover:text-[#2d6a4f] px-2 py-1 rounded hover:bg-gray-50">Edit</button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">Delete</button>
          <span className="text-gray-300 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {trial.start_datetime && <div><span className="font-semibold text-gray-500">Start: </span>{new Date(trial.start_datetime).toLocaleString('en-GB')}</div>}
            {trial.end_datetime   && <div><span className="font-semibold text-gray-500">End: </span>{new Date(trial.end_datetime).toLocaleString('en-GB')}</div>}
            {trial.dogs_mixed_with && <div><span className="font-semibold text-gray-500">Mixed with: </span>{trial.dogs_mixed_with}</div>}
            {trial.log_date && <div><span className="font-semibold text-gray-500">Log date: </span>{trial.log_date}</div>}
          </div>
          {/* Sections */}
          {hasSectionNotes ? sections.map(s => trial[s.key as TrialSectionKey] ? (
            <div key={s.key}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{trial[s.key as TrialSectionKey]}</p>
            </div>
          ) : null) : (
            <p className="text-xs text-gray-400">No observation notes recorded.</p>
          )}
        </div>
      )}
    </div>
  )
}

interface DogConflict {
  id: number
  dog: { id: number; name: string; breed: string | null }
  notes: string | null
}

function DogConflictsSection({ dogId, allDogs }: { dogId: number; allDogs: { id: number; name: string; breed: string | null }[] }) {
  const [conflicts, setConflicts] = useState<DogConflict[]>([])
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/dogs/${dogId}/conflicts`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setConflicts(data) })
      .catch(() => {})
  }, [dogId])

  const conflictingIds = new Set([dogId, ...conflicts.map(c => c.dog.id)])
  const available = allDogs.filter(d => !conflictingIds.has(d.id))

  const handleAdd = async () => {
    if (!selectedId) return
    setSaving(true)
    const res = await fetch(`/api/dogs/${dogId}/conflicts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otherDogId: parseInt(selectedId), notes: notes.trim() || null }),
    })
    const newConflict = await res.json()
    setConflicts(prev => [...prev, newConflict].sort((a, b) => a.dog.name.localeCompare(b.dog.name)))
    setSelectedId('')
    setNotes('')
    setAdding(false)
    setSaving(false)
  }

  const handleRemove = async (otherDogId: number) => {
    if (!confirm('Remove this conflict?')) return
    await fetch(`/api/dogs/${dogId}/conflicts`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otherDogId }),
    })
    setConflicts(prev => prev.filter(c => c.dog.id !== otherDogId))
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Doesn&apos;t Get Along With</span>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="text-xs text-[#2d6a4f] hover:underline font-medium">+ Add</button>
        )}
      </div>

      {conflicts.length === 0 && !adding && (
        <p className="text-sm text-gray-400">No conflicts recorded.</p>
      )}

      <div className="space-y-2">
        {conflicts.map(c => (
          <div key={c.id} className="flex items-start justify-between gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-800">
                🚫 {c.dog.name}{c.dog.breed ? <span className="text-gray-400 font-normal"> ({c.dog.breed})</span> : null}
              </p>
              {c.notes && <p className="text-xs text-gray-500 mt-0.5">{c.notes}</p>}
            </div>
            <button onClick={() => handleRemove(c.dog.id)}
              className="text-red-400 hover:text-red-600 text-xs shrink-0 mt-0.5">Remove</button>
          </div>
        ))}
      </div>

      {adding && (
        <div className="mt-2 border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white">
            <option value="">— Select a dog —</option>
            {available.map(d => (
              <option key={d.id} value={d.id}>{d.name}{d.breed ? ` (${d.breed})` : ''}</option>
            ))}
          </select>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notes (optional) — e.g. snapped at each other during trial"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!selectedId || saving}
              className="bg-[#2d6a4f] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#245a41] disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setAdding(false); setSelectedId(''); setNotes('') }}
              className="text-gray-500 px-3 py-1.5 rounded-lg text-xs border border-gray-200 hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DogTrialsTab({ dogId }: { dogId: number }) {
  const [trials, setTrials]       = useState<TrialReview[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editingTrial, setEditingTrial] = useState<TrialReview | undefined>()

  useEffect(() => {
    fetch(`/api/dogs/${dogId}/trials`)
      .then(r => r.json())
      .then(data => { setTrials(Array.isArray(data) ? data : []); setLoading(false) })
  }, [dogId])

  const handleSave = (saved: TrialReview) => {
    setTrials(prev => {
      const idx = prev.findIndex(t => t.id === saved.id)
      if (idx >= 0) { const updated = [...prev]; updated[idx] = saved; return updated }
      return [saved, ...prev]
    })
    setShowForm(false)
    setEditingTrial(undefined)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this trial review?')) return
    await fetch(`/api/dogs/${dogId}/trials/${id}`, { method: 'DELETE' })
    setTrials(prev => prev.filter(t => t.id !== id))
  }

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>

  return (
    <div>
      <TrialEligibilityBadges trials={trials} />

      {(showForm || editingTrial) ? (
        <TrialForm
          dogId={dogId}
          initial={editingTrial}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingTrial(undefined) }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">{trials.length} trial review{trials.length !== 1 ? 's' : ''}</span>
            <button
              onClick={() => setShowForm(true)}
              className="text-sm bg-[#2d6a4f] text-white px-3 py-1.5 rounded-lg hover:bg-[#245a41] transition-colors font-medium"
            >
              + Add Trial Review
            </button>
          </div>
          {trials.length === 0 ? (
            <p className="text-gray-400 text-sm">No trial reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {trials.map(t => (
                <TrialCard
                  key={t.id}
                  trial={t}
                  onEdit={() => { setEditingTrial(t); setShowForm(false) }}
                  onDelete={() => handleDelete(t.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DogInvoicesTab({ dogId }: { dogId: number }) {
  const [invoices, setInvoices] = useState<{id: number; invoice_number: string; invoice_date: string | null; total: number; status: string}[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/invoices')
      .then(r => r.json())
      .then((all: {id: number; invoice_number: string; invoice_date: string | null; total: number; status: string; dog_id: number | null}[]) => {
        setInvoices(all.filter(inv => inv.dog_id === dogId))
        setLoading(false)
      })
  }, [dogId])

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-600">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
        <Link
          href={`/invoices/new?dogId=${dogId}`}
          className="text-sm bg-[#2d6a4f] text-white px-3 py-1.5 rounded-lg hover:bg-[#245a41] transition-colors font-medium"
        >
          + New Invoice
        </Link>
      </div>
      {invoices.length === 0 ? (
        <p className="text-gray-400 text-sm">No invoices yet for this dog.</p>
      ) : (
        <div className="space-y-2">
          {invoices.map(inv => (
            <Link
              key={inv.id}
              href={`/invoices/${inv.id}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div>
                <span className="font-mono font-semibold text-[#2d6a4f] text-sm">#{inv.invoice_number}</span>
                {inv.invoice_date && (
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(inv.invoice_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  inv.status === 'Paid' ? 'bg-green-100 text-green-700'
                  : inv.status === 'Void' ? 'bg-gray-100 text-gray-500'
                  : 'bg-amber-100 text-amber-700'
                }`}>
                  {inv.status === 'Paid' ? '✓ Paid' : inv.status === 'Void' ? '✗ Void' : 'Unpaid'}
                </span>
                <span className="font-semibold text-gray-800 text-sm">£{inv.total.toFixed(2)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function DogIncidentsTab({ dogId }: { dogId: number }) {
  const [incidents, setIncidents] = useState<{ id: number; incident_date: string | null; incident_time: string | null; location: string | null; description: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/incidents')
      .then(r => r.json())
      .then((all: { id: number; dog_id: number | null; incident_date: string | null; incident_time: string | null; location: string | null; description: string | null }[]) => {
        setIncidents(all.filter(i => i.dog_id === dogId))
        setLoading(false)
      })
  }, [dogId])

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-600">{incidents.length} incident report{incidents.length !== 1 ? 's' : ''}</span>
        <a
          href={`/incidents/new?dogId=${dogId}`}
          className="text-sm bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors font-medium"
        >
          + Log Incident
        </a>
      </div>
      {incidents.length === 0 ? (
        <p className="text-gray-400 text-sm">No incidents recorded for this dog.</p>
      ) : (
        <div className="space-y-2">
          {incidents.map(inc => (
            <a
              key={inc.id}
              href={`/incidents/${inc.id}`}
              className="flex items-start justify-between p-3 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-red-600">⚠ Incident</span>
                  {inc.incident_date && (
                    <span className="text-xs text-gray-500">
                      {new Date(inc.incident_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {inc.incident_time && ` at ${inc.incident_time}`}
                    </span>
                  )}
                </div>
                {inc.location && <p className="text-xs text-gray-500">{inc.location}</p>}
                {inc.description && (
                  <p className="text-sm text-gray-700 mt-1 line-clamp-2">{inc.description}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

const DOG_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface DogBooking {
  id: number
  booking_type: string
  start_date: string
  end_date: string | null
  drop_off_time: string | null
  pick_up_time: string | null
  status: string
  is_recurring: boolean
  day_of_week: number | null
  _virtual_date?: string
}

function nightsBetween(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)))
}

function getNextOccurrencesDog(dayOfWeek: number, count = 4): string[] {
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

function bookingBadgeStyle(type: string) {
  if (type === 'Boarding')       return 'bg-purple-100 text-purple-700'
  if (type === 'Boarding Trial') return 'bg-purple-50 text-purple-500 border border-purple-200'
  if (type === 'Daycare Trial')  return 'bg-yellow-50 text-yellow-600 border border-yellow-200'
  return 'bg-yellow-100 text-yellow-700'
}

function bookingIcon(type: string) { return type.startsWith('Boarding') ? '🌙' : '☀️' }

function formatDbBookingDate(b: DogBooking, virtualDate?: string) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  const dateStr = virtualDate ?? b.start_date
  const d = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', opts)
  if (b.booking_type === 'Boarding' && b.end_date) {
    const e = new Date(b.end_date + 'T12:00:00').toLocaleDateString('en-GB', opts)
    return `${d} → ${e}`
  }
  const times = [b.drop_off_time, b.pick_up_time].filter(Boolean).join(' → ')
  return times ? `${d}, ${times}` : d
}

function DogBookingsTab({ dogId }: { dogId: number; dogName: string }) {
  const [bookings, setBookings] = useState<DogBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/bookings?dogId=${dogId}`)
      .then(r => r.json())
      .then((data: DogBooking[]) => {
        setBookings(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [dogId])

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const pastNonRecurring = bookings
    .filter(b => !b.is_recurring && new Date((b.end_date ?? b.start_date) + 'T23:59:00') < now)
    .sort((a, b) => b.start_date.localeCompare(a.start_date))

  const upcomingNonRecurring = bookings.filter(b =>
    !b.is_recurring &&
    new Date((b.end_date ?? b.start_date) + 'T23:59:00') >= now &&
    b.status !== 'Cancelled'
  )

  const recurringExpanded: DogBooking[] = []
  for (const b of bookings) {
    if (!b.is_recurring || b.status === 'Cancelled' || b.day_of_week == null) continue
    for (const date of getNextOccurrencesDog(b.day_of_week, 4)) {
      recurringExpanded.push({ ...b, _virtual_date: date })
    }
  }

  const upcoming = [...upcomingNonRecurring, ...recurringExpanded].sort((a, b) =>
    (a._virtual_date ?? a.start_date).localeCompare(b._virtual_date ?? b.start_date)
  )

  // Stats from past completed bookings
  const boardingNights = pastNonRecurring
    .filter(b => b.booking_type === 'Boarding')
    .reduce((s, b) => s + (b.end_date ? nightsBetween(b.start_date, b.end_date) : 1), 0)
  const daycareDays  = pastNonRecurring.filter(b => b.booking_type === 'Daycare').length
  const trialCount   = pastNonRecurring.filter(b => b.booking_type.includes('Trial')).length
  const showStats    = boardingNights > 0 || daycareDays > 0 || trialCount > 0

  return (
    <div>
      <div className="flex justify-end mb-4">
        <a href={`/bookings/new?dogId=${dogId}`}
          className="bg-[#2d6a4f] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#245a41] transition-colors">
          + New Booking
        </a>
      </div>

      {bookings.length === 0 ? (
        <p className="text-gray-400 text-sm">No bookings found for this dog.</p>
      ) : (
        <>
          {showStats && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-purple-700">{boardingNights}</p>
                <p className="text-xs text-purple-500 font-medium">Nights</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-yellow-700">{daycareDays}</p>
                <p className="text-xs text-yellow-600 font-medium">Daycare Days</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-600">{trialCount}</p>
                <p className="text-xs text-gray-500 font-medium">Trials</p>
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="mb-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Upcoming</h3>
              <div className="space-y-2">
                {upcoming.map((b, i) => (
                  <a key={b._virtual_date ? `${b.id}-${b._virtual_date}` : `${b.id}-${i}`}
                    href={`/bookings/${b.id}`}
                    className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {formatDbBookingDate(b, b._virtual_date)}
                      </p>
                      {b.is_recurring && b.day_of_week != null && (
                        <p className="text-xs text-blue-500 mt-0.5">🔁 Recurring every {DOG_DAY_NAMES[b.day_of_week]}</p>
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${bookingBadgeStyle(b.booking_type)}`}>
                      {bookingIcon(b.booking_type)} {b.booking_type}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {pastNonRecurring.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Past</h3>
              <div className="space-y-2">
                {pastNonRecurring.map((b, i) => (
                  <a key={`past-${b.id}-${i}`}
                    href={`/bookings/${b.id}`}
                    className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 opacity-60 hover:opacity-80 transition-opacity">
                    <p className="text-sm font-medium text-gray-700">{formatDbBookingDate(b)}</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${bookingBadgeStyle(b.booking_type)}`}>
                      {bookingIcon(b.booking_type)} {b.booking_type}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-0.5">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  )
}

function ContactCard({ title, person }: { title: string; person: { name?: string | null; phone?: string | null; emergency_phone?: string | null; address?: string | null; email?: string | null } | null }) {
  if (!person) return null
  const hasInfo = person.name || person.phone || person.email || person.address
  if (!hasInfo) return null
  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-3">
      <h4 className="font-semibold text-[#2d6a4f] mb-2 text-sm">{title}</h4>
      {person.name && <p className="text-sm font-medium text-gray-800">{person.name}</p>}
      {person.phone && (
        <a href={`tel:${person.phone}`} className="text-sm text-blue-600 hover:underline block">{person.phone}</a>
      )}
      {person.emergency_phone && (
        <p className="text-xs text-gray-500">Emergency: <a href={`tel:${person.emergency_phone}`} className="text-blue-600 hover:underline">{person.emergency_phone}</a></p>
      )}
      {person.email && (
        <a href={`mailto:${person.email}`} className="text-sm text-blue-600 hover:underline block">{person.email}</a>
      )}
      {person.address && <p className="text-sm text-gray-600 mt-1">{person.address}</p>}
    </div>
  )
}

function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) return parsed
    return [String(parsed)]
  } catch {
    return val.split(',').map((s) => s.trim()).filter(Boolean)
  }
}

export default function DogProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [dog, setDog] = useState<Dog | null>(null)
  const [allDogs, setAllDogs] = useState<{ id: number; name: string; breed: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Profile')
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/dogs/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setDog(data)
        setNotes(data.notes || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
    fetch('/api/dogs').then(r => r.json()).then(setAllDogs)
  }, [id])

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${dog?.name}'s profile? This cannot be undone.`)) return
    setDeleting(true)
    await fetch(`/api/dogs/${id}`, { method: 'DELETE' })
    router.push('/')
  }

  const handleArchive = async () => {
    if (!confirm(`Archive ${dog?.name}? They'll be hidden from active lists but all their data is kept.`)) return
    setArchiving(true)
    const res = await fetch(`/api/dogs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    })
    const updated = await res.json()
    setDog(updated)
    setArchiving(false)
  }

  const handleUnarchive = async () => {
    setArchiving(true)
    const res = await fetch(`/api/dogs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false }),
    })
    const updated = await res.json()
    setDog(updated)
    setArchiving(false)
  }

  const handleToggleSolo = async () => {
    if (!dog) return
    const newVal = !dog.is_solo
    if (newVal && !confirm(`Mark ${dog.name} as Solo? They will not be bookable on the same day as other Solo dogs.`)) return
    const res = await fetch(`/api/dogs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_solo: newVal }),
    })
    const updated = await res.json()
    setDog(updated)
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    await fetch(`/api/dogs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    setSavingNotes(false)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    const formData = new FormData()
    formData.append('photo', file)
    const res = await fetch(`/api/dogs/${id}/photo`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (data.photo_path && dog) {
      setDog({ ...dog, photo_path: data.photo_path })
    }
    setUploadingPhoto(false)
  }

  if (loading) return <div className="flex justify-center py-16 text-gray-500">Loading...</div>
  if (!dog) return <div className="text-center py-16 text-gray-500">Dog not found</div>

  const consentActivities = parseJsonArray(dog.consent_daily_activities)
  const equipmentProvided = parseJsonArray(dog.equipment_provided)
  const equipmentWdc = parseJsonArray(dog.equipment_wdc)

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-[#2d6a4f] hover:underline flex items-center gap-1 mb-4">
        ← Back to all dogs
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
        <div
          className="relative bg-gray-100 cursor-pointer group"
          style={{ minHeight: 240 }}
          onClick={handlePhotoClick}
        >
          {dog.photo_path ? (
            <img
              src={dog.photo_path}
              alt={dog.name}
              className="w-full object-cover"
              style={{ maxHeight: 320 }}
            />
          ) : (
            <div className="flex items-center justify-center text-gray-300" style={{ minHeight: 200 }}>
              <span className="text-8xl">🐕</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-3 py-1.5 rounded-full">
              {uploadingPhoto ? 'Uploading...' : 'Tap to change photo'}
            </span>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />

        <div className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{dog.name}</h1>
              {dog.breed && <p className="text-gray-500 text-sm mt-0.5">{dog.breed}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {(() => {
                  if (dog.birth_date) {
                    const diff = Date.now() - new Date(dog.birth_date).getTime()
                    const years = diff / (1000 * 60 * 60 * 24 * 365.25)
                    const label = years < 1 ? `${Math.round(years * 12)} months` : `${years.toFixed(1)} yrs`
                    return (
                      <span className="text-xs bg-green-50 text-[#2d6a4f] px-2 py-0.5 rounded-full font-medium" title={`Born ${dog.birth_date}`}>
                        {label}
                      </span>
                    )
                  } else if (dog.age) {
                    return (
                      <span className="text-xs bg-green-50 text-[#2d6a4f] px-2 py-0.5 rounded-full font-medium">
                        {dog.age} yrs
                      </span>
                    )
                  }
                  return null
                })()}
                {dog.sex && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {dog.sex}
                  </span>
                )}
                {dog.neutered !== null && dog.neutered !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dog.neutered ? 'bg-purple-50 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>
                    {dog.neutered ? 'Neutered' : 'Intact'}
                  </span>
                )}
                {dog.energy_level && (
                  <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                    {dog.energy_level} energy
                  </span>
                )}
                {dog.is_solo && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    🐶 Solo
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleSolo}
                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${dog.is_solo ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
              >
                {dog.is_solo ? '🐶 Solo' : 'Set Solo'}
              </button>
              {dog.archived ? (
                <button
                  onClick={handleUnarchive}
                  disabled={archiving}
                  className="text-sm bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-60"
                >
                  {archiving ? 'Restoring...' : 'Unarchive'}
                </button>
              ) : (
                <button
                  onClick={handleArchive}
                  disabled={archiving}
                  className="text-sm border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors font-medium disabled:opacity-60"
                >
                  {archiving ? 'Archiving...' : 'Archive'}
                </button>
              )}
              <Link
                href={`/dogs/${dog.id}/edit`}
                className="text-sm bg-[#2d6a4f] text-white px-3 py-1.5 rounded-lg hover:bg-[#245a41] transition-colors font-medium"
              >
                Edit
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Archived banner */}
      {dog.archived && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 text-lg">📦</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">This dog is archived</p>
              <p className="text-xs text-amber-600">They are hidden from active lists. All data is preserved.</p>
            </div>
          </div>
          <button
            onClick={handleUnarchive}
            disabled={archiving}
            className="text-xs font-semibold bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {archiving ? 'Restoring...' : 'Unarchive'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-[#2d6a4f] border-b-2 border-[#2d6a4f]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'Profile' && (
            <div>
              <InfoRow label="Energy Level" value={dog.energy_level} />
              <InfoRow label="Off-Lead" value={dog.off_lead} />
              <InfoRow label="Gets Along With Cats" value={dog.gets_along_with_cats} />
              <InfoRow label="Good With Children" value={dog.good_with_children} />
              <InfoRow label="Special Behaviours / Triggers" value={dog.special_behaviours} />
              <DogConflictsSection dogId={dog.id} allDogs={allDogs} />
              <div className="border-t border-gray-100 my-4" />
              <InfoRow label="Exercise Needs" value={dog.exercise_needs} />
              <InfoRow label="Sleeping Arrangements" value={dog.sleeping_arrangements} />
              <InfoRow label="Favourite Activities" value={dog.favourite_activities} />
              <InfoRow label="Dog Commands" value={dog.dog_commands} />
              <div className="border-t border-gray-100 my-4" />
              <InfoRow label="Feeding Schedule" value={dog.feeding_schedule} />
              <InfoRow label="Food Type / Brand" value={dog.food_type} />
              <InfoRow label="Portion Size" value={dog.portion_size} />
              <InfoRow label="Treats Allowed" value={dog.treats_allowed} />
              <InfoRow label="Food & Treats Notes" value={dog.food_and_treats} />
              <InfoRow label="Dietary Requirements" value={dog.dietary_requirements} />
              <div className="border-t border-gray-100 my-4" />
              <InfoRow label="Vaccination Date" value={dog.vaccination_date} />
              <InfoRow label="Flea & Worm Treatment Date" value={dog.flea_worm_date} />
              <InfoRow label="Medical Requirements" value={dog.medical_requirements} />
              <InfoRow label="Microchip Number" value={dog.microchip_number} />
            </div>
          )}

          {activeTab === 'Contacts & Notes' && (
            <div>
              {dog.owners.map((owner, i) => (
                <ContactCard key={owner.id} title={i === 0 ? 'Owner' : `Owner ${i + 1}`} person={owner} />
              ))}
              {dog.vets.map((vet, i) => (
                <ContactCard key={vet.id} title={i === 0 ? 'Vet' : `Vet ${i + 1}`} person={vet} />
              ))}
              {dog.buddies.map((buddy) => (
                <ContactCard key={buddy.id} title={buddy.is_primary ? 'Primary Buddy' : 'Secondary Buddy'} person={buddy} />
              ))}
              {dog.owners.length === 0 && dog.vets.length === 0 && dog.buddies.length === 0 && (
                <p className="text-gray-500 text-sm">No contacts added yet.</p>
              )}
              <div className="border-t border-gray-100 my-4" />
              {consentActivities.length > 0 && (
                <div className="mb-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Consented Daily Activities</span>
                  <div className="flex flex-wrap gap-1.5">
                    {consentActivities.map((item, i) => (
                      <span key={i} className="text-xs bg-green-50 text-[#2d6a4f] border border-green-200 px-2 py-0.5 rounded-full">{item}</span>
                    ))}
                  </div>
                </div>
              )}
              <InfoRow label="Concerns About Daily Activities" value={dog.concerns_daily_activities} />
              {equipmentProvided.length > 0 && (
                <div className="mb-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Equipment Provided by Owner</span>
                  <div className="flex flex-wrap gap-1.5">
                    {equipmentProvided.map((item, i) => (
                      <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{item}</span>
                    ))}
                  </div>
                </div>
              )}
              {equipmentWdc.length > 0 && (
                <div className="mb-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Equipment Provided by WDC</span>
                  <div className="flex flex-wrap gap-1.5">
                    {equipmentWdc.map((item, i) => (
                      <span key={i} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">{item}</span>
                    ))}
                  </div>
                </div>
              )}
              <InfoRow label="Social Media Consent" value={dog.consent_social_media} />
              <InfoRow label="Preferred Communication" value={dog.consent_communication} />
              <div className="border-t border-gray-100 my-4" />
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                placeholder="Add any notes about this dog..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none"
              />
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="bg-[#2d6a4f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#245a41] transition-colors disabled:opacity-60"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
                {notesSaved && <span className="text-green-600 text-sm">Saved!</span>}
              </div>
            </div>
          )}

          {activeTab === 'Bookings & Trials' && (
            <div>
              <DogBookingsTab dogId={parseInt(id)} dogName={dog.name} />
              <div className="border-t border-gray-100 my-6" />
              <DogTrialsTab dogId={parseInt(id)} />
            </div>
          )}

          {activeTab === 'Invoices' && (
            <DogInvoicesTab dogId={parseInt(id)} />
          )}

          {activeTab === 'Incidents' && (
            <DogIncidentsTab dogId={parseInt(id)} />
          )}
        </div>
      </div>

      {/* Delete button */}
      <div className="mt-6 flex justify-end pb-8">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-4 py-2 rounded-lg transition-colors"
        >
          {deleting ? 'Deleting...' : 'Delete Dog Profile'}
        </button>
      </div>
    </div>
  )
}
