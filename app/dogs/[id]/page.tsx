'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, Btn, Pill, Field, FieldGrid } from '../../components/ui'

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

function outcomePillColor(outcome: string): 'green' | 'red' | 'gold' {
  if (outcome === 'Passed') return 'green'
  if (outcome === 'Failed') return 'red'
  return 'gold'
}

function TrialEligibilityBadges({ trials }: { trials: TrialReview[] }) {
  const passedBoarding = trials.some(t => t.trial_type === 'Boarding' && t.outcome === 'Passed')
  const passedAny      = trials.some(t => t.outcome === 'Passed')
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      <Pill color={passedAny ? 'green' : 'neutral'} dot>{passedAny ? 'Daycare eligible' : 'Not daycare eligible'}</Pill>
      <Pill color={passedBoarding ? 'green' : 'neutral'} dot>{passedBoarding ? 'Boarding eligible' : 'Not boarding eligible'}</Pill>
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
    const url    = initial ? `/api/dogs/${dogId}/trials/${initial.id}` : `/api/dogs/${dogId}/trials`
    const method = initial ? 'PUT' : 'POST'
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const saved  = await res.json()
    setSaving(false)
    onSave(saved)
  }

  const sections = TRIAL_SECTIONS.filter(s => !s.boardingOnly || form.trial_type === 'Boarding')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label>Trial Type</label>
          <select value={form.trial_type} onChange={e => set('trial_type', e.target.value)} style={{ width: '100%', marginTop: 4 }}>
            <option>Boarding</option>
            <option>Daycare</option>
          </select>
        </div>
        <div>
          <label>Outcome</label>
          <select value={form.outcome} onChange={e => set('outcome', e.target.value)} style={{ width: '100%', marginTop: 4 }}>
            <option>Pending</option>
            <option>Passed</option>
            <option>Failed</option>
          </select>
        </div>
        <div>
          <label>Start Date & Time</label>
          <input type="datetime-local" value={form.start_datetime} onChange={e => set('start_datetime', e.target.value)} style={{ width: '100%', marginTop: 4 }} />
        </div>
        <div>
          <label>End Date & Time</label>
          <input type="datetime-local" value={form.end_datetime} onChange={e => set('end_datetime', e.target.value)} style={{ width: '100%', marginTop: 4 }} />
        </div>
        <div>
          <label>Dogs Mixed With</label>
          <input type="text" value={form.dogs_mixed_with} onChange={e => set('dogs_mixed_with', e.target.value)} style={{ width: '100%', marginTop: 4 }} />
        </div>
        <div>
          <label>Completed By</label>
          <select value={form.completed_by} onChange={e => set('completed_by', e.target.value)} style={{ width: '100%', marginTop: 4 }}>
            <option value="">— Select —</option>
            <option>Jack Rojas Powell</option>
            <option>Kim Rojas Powell</option>
          </select>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label>Log Date</label>
          <input type="date" value={form.log_date} onChange={e => set('log_date', e.target.value)} style={{ width: '100%', marginTop: 4 }} />
        </div>
      </div>

      {sections.map(s => (
        <div key={s.key}>
          <label style={{ fontFamily: 'var(--font-body)', textTransform: 'none', letterSpacing: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.label}</label>
          {s.sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 4px' }}>{s.sub}</p>}
          <ul style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, paddingLeft: 16 }}>
            {s.hints.map(h => <li key={h}>{h}</li>)}
          </ul>
          <textarea
            rows={4}
            value={form[s.key as TrialSectionKey]}
            onChange={e => set(s.key, e.target.value)}
            placeholder={`Notes on ${s.label.toLowerCase()}...`}
            style={{ width: '100%', resize: 'none' }}
          />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8 }}>
        <Btn type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Trial Review'}</Btn>
        <Btn type="button" variant="secondary" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  )
}

function TrialCard({ trial, onEdit, onDelete }: { trial: TrialReview; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const sections = TRIAL_SECTIONS.filter(s => !s.boardingOnly || trial.trial_type === 'Boarding')
  const hasSectionNotes = sections.some(s => trial[s.key as TrialSectionKey])

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Pill color={outcomePillColor(trial.outcome)}>{trial.outcome}</Pill>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{trial.trial_type} Trial</p>
            {trial.start_datetime && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                {new Date(trial.start_datetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {trial.completed_by && ` · ${trial.completed_by}`}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={e => { e.stopPropagation(); onEdit() }} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>Edit</button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} style={{ fontSize: 11, color: 'var(--tint-red-text)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>Delete</button>
          <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px', background: 'var(--surface-app)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            {trial.start_datetime && <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Start: </span>{new Date(trial.start_datetime).toLocaleString('en-GB')}</div>}
            {trial.end_datetime   && <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>End: </span>{new Date(trial.end_datetime).toLocaleString('en-GB')}</div>}
            {trial.dogs_mixed_with && <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Mixed with: </span>{trial.dogs_mixed_with}</div>}
            {trial.log_date && <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Log date: </span>{trial.log_date}</div>}
          </div>
          {hasSectionNotes ? sections.map(s => trial[s.key as TrialSectionKey] ? (
            <div key={s.key}>
              <p style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', margin: 0 }}>{trial[s.key as TrialSectionKey]}</p>
            </div>
          ) : null) : (
            <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>No observation notes recorded.</p>
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
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>Doesn&apos;t Get Along With</span>
        {!adding && (
          <button onClick={() => setAdding(true)} style={{ fontSize: 12, color: 'var(--cta-purple)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
        )}
      </div>

      {conflicts.length === 0 && !adding && (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>No conflicts recorded.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {conflicts.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, background: 'var(--tint-red)', border: '1px solid var(--tint-red-text)', borderRadius: 8, padding: '8px 10px', opacity: 0.9 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                {c.dog.name}{c.dog.breed ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({c.dog.breed})</span> : null}
              </p>
              {c.notes && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.notes}</p>}
            </div>
            <button onClick={() => handleRemove(c.dog.id)} style={{ fontSize: 11, color: 'var(--tint-red-text)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}>Remove</button>
          </div>
        ))}
      </div>

      {adding && (
        <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--surface-app)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={{ width: '100%' }}>
            <option value="">— Select a dog —</option>
            {available.map(d => (
              <option key={d.id} value={d.id}>{d.name}{d.breed ? ` (${d.breed})` : ''}</option>
            ))}
          </select>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notes (optional) — e.g. snapped at each other during trial"
            style={{ width: '100%' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn size="sm" type="button" onClick={handleAdd} disabled={!selectedId || saving}>{saving ? 'Saving…' : 'Save'}</Btn>
            <Btn size="sm" variant="secondary" type="button" onClick={() => { setAdding(false); setSelectedId(''); setNotes('') }}>Cancel</Btn>
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

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>

  return (
    <div>
      <TrialEligibilityBadges trials={trials} />
      {(showForm || editingTrial) ? (
        <TrialForm dogId={dogId} initial={editingTrial} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingTrial(undefined) }} />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{trials.length} trial review{trials.length !== 1 ? 's' : ''}</span>
            <Btn size="sm" onClick={() => setShowForm(true)}>+ Add Trial Review</Btn>
          </div>
          {trials.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>No trial reviews yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {trials.map(t => (
                <TrialCard key={t.id} trial={t} onEdit={() => { setEditingTrial(t); setShowForm(false) }} onDelete={() => handleDelete(t.id)} />
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

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
        <Btn size="sm" href={`/invoices/new?dogId=${dogId}`}>+ New Invoice</Btn>
      </div>
      {invoices.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>No invoices yet for this dog.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {invoices.map(inv => (
            <Link key={inv.id} href={`/invoices/${inv.id}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-app)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-label)', fontSize: 11, color: 'var(--cta-purple)', fontWeight: 600 }}>#{inv.invoice_number}</span>
                {inv.invoice_date && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(inv.invoice_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill color={inv.status === 'Paid' ? 'green' : inv.status === 'Void' ? 'neutral' : 'amber'}>
                  {inv.status === 'Paid' ? 'Paid' : inv.status === 'Void' ? 'Void' : 'Unpaid'}
                </Pill>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>£{inv.total.toFixed(2)}</span>
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

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{incidents.length} incident report{incidents.length !== 1 ? 's' : ''}</span>
        <Btn size="sm" href={`/incidents/new?dogId=${dogId}`} variant="secondary">+ Log Incident</Btn>
      </div>
      {incidents.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>No incidents recorded for this dog.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {incidents.map(inc => (
            <Link key={inc.id} href={`/incidents/${inc.id}`}
              style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', background: 'var(--tint-red)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Pill color="red">Incident</Pill>
                {inc.incident_date && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(inc.incident_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {inc.incident_time && ` at ${inc.incident_time}`}
                  </span>
                )}
              </div>
              {inc.location && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{inc.location}</p>}
              {inc.description && <p style={{ fontSize: 13, color: 'var(--text)', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{inc.description}</p>}
            </Link>
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

function bookingPillColor(type: string): 'purple' | 'gold' {
  return type.startsWith('Boarding') ? 'purple' : 'gold'
}

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
      .then((data: DogBooking[]) => { setBookings(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [dogId])

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>

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

  const boardingNights = pastNonRecurring
    .filter(b => b.booking_type === 'Boarding')
    .reduce((s, b) => s + (b.end_date ? nightsBetween(b.start_date, b.end_date) : 1), 0)
  const daycareDays  = pastNonRecurring.filter(b => b.booking_type === 'Daycare').length
  const trialCount   = pastNonRecurring.filter(b => b.booking_type.includes('Trial')).length
  const showStats    = boardingNights > 0 || daycareDays > 0 || trialCount > 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Btn size="sm" href={`/bookings/new?dogId=${dogId}`}>+ New Booking</Btn>
      </div>
      {bookings.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>No bookings found for this dog.</p>
      ) : (
        <>
          {showStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ background: 'var(--tint-purple)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--tint-purple-text)', margin: 0 }}>{boardingNights}</p>
                <p style={{ fontSize: 11, color: 'var(--tint-purple-text)', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85, margin: 0 }}>Nights</p>
              </div>
              <div style={{ background: 'var(--tint-gold)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--tint-gold-text)', margin: 0 }}>{daycareDays}</p>
                <p style={{ fontSize: 11, color: 'var(--tint-gold-text)', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85, margin: 0 }}>Daycare Days</p>
              </div>
              <div style={{ background: 'var(--tint-neutral)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--tint-neutral-text)', margin: 0 }}>{trialCount}</p>
                <p style={{ fontSize: 11, color: 'var(--tint-neutral-text)', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85, margin: 0 }}>Trials</p>
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10.5, color: 'var(--text-dim)', marginBottom: 6 }}>Upcoming</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {upcoming.map((b, i) => (
                  <Link key={b._virtual_date ? `${b.id}-${b._virtual_date}` : `${b.id}-${i}`} href={`/bookings/${b.id}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-app)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{formatDbBookingDate(b, b._virtual_date)}</p>
                      {b.is_recurring && b.day_of_week != null && (
                        <p style={{ fontSize: 11, color: 'var(--tint-blue-text)', marginTop: 2 }}>Recurring every {DOG_DAY_NAMES[b.day_of_week]}</p>
                      )}
                    </div>
                    <Pill color={bookingPillColor(b.booking_type)}>{b.booking_type}</Pill>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {pastNonRecurring.length > 0 && (
            <div>
              <p style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10.5, color: 'var(--text-dim)', marginBottom: 6 }}>Past</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pastNonRecurring.map((b, i) => (
                  <Link key={`past-${b.id}-${i}`} href={`/bookings/${b.id}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-app)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)', opacity: 0.65 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{formatDbBookingDate(b)}</p>
                    <Pill color={bookingPillColor(b.booking_type)}>{b.booking_type}</Pill>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ContactCard({ title, person }: { title: string; person: { name?: string | null; phone?: string | null; emergency_phone?: string | null; address?: string | null; email?: string | null } | null }) {
  if (!person) return null
  const hasInfo = person.name || person.phone || person.email || person.address
  if (!hasInfo) return null
  return (
    <div style={{ background: 'var(--surface-app)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
      <h4 style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10.5, color: 'var(--cta-purple)', margin: '0 0 8px', fontWeight: 600 }}>{title}</h4>
      {person.name && <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>{person.name}</p>}
      {person.phone && <a href={`tel:${person.phone}`} style={{ fontSize: 13, color: 'var(--tint-blue-text)', display: 'block' }}>{person.phone}</a>}
      {person.emergency_phone && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Emergency: <a href={`tel:${person.emergency_phone}`} style={{ color: 'var(--tint-blue-text)' }}>{person.emergency_phone}</a></p>}
      {person.email && <a href={`mailto:${person.email}`} style={{ fontSize: 13, color: 'var(--tint-blue-text)', display: 'block' }}>{person.email}</a>}
      {person.address && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{person.address}</p>}
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
      .then((data) => { setDog(data); setNotes(data.notes || ''); setLoading(false) })
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
    const res = await fetch(`/api/dogs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: true }) })
    const updated = await res.json()
    setDog(updated)
    setArchiving(false)
  }

  const handleUnarchive = async () => {
    setArchiving(true)
    const res = await fetch(`/api/dogs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: false }) })
    const updated = await res.json()
    setDog(updated)
    setArchiving(false)
  }

  const handleToggleSolo = async () => {
    if (!dog) return
    const newVal = !dog.is_solo
    if (newVal && !confirm(`Mark ${dog.name} as Solo? They will not be bookable on the same day as other Solo dogs.`)) return
    const res = await fetch(`/api/dogs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_solo: newVal }) })
    const updated = await res.json()
    setDog(updated)
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    await fetch(`/api/dogs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) })
    setSavingNotes(false)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const handlePhotoClick = () => { fileInputRef.current?.click() }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    const formData = new FormData()
    formData.append('photo', file)
    const res = await fetch(`/api/dogs/${id}/photo`, { method: 'POST', body: formData })
    const data = await res.json()
    if (data.photo_path && dog) setDog({ ...dog, photo_path: data.photo_path })
    setUploadingPhoto(false)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Loading…</div>
  if (!dog) return <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Dog not found</div>

  const consentActivities = parseJsonArray(dog.consent_daily_activities)
  const equipmentProvided = parseJsonArray(dog.equipment_provided)
  const equipmentWdc = parseJsonArray(dog.equipment_wdc)

  // Compute age label
  let ageLabel = ''
  if (dog.birth_date) {
    const diff = Date.now() - new Date(dog.birth_date).getTime()
    const years = diff / (1000 * 60 * 60 * 24 * 365.25)
    ageLabel = years < 1 ? `${Math.round(years * 12)} months` : `${years.toFixed(1)} yrs`
  } else if (dog.age) {
    ageLabel = `${dog.age} yrs`
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--cta-purple)', fontFamily: 'var(--font-label)', letterSpacing: '0.06em', marginBottom: 16 }}>
        ← Back to dogs
      </Link>

      {/* Header card */}
      <Card style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
        {/* Photo */}
        <div
          style={{ position: 'relative', background: 'var(--tint-neutral)', cursor: 'pointer', minHeight: 200, maxHeight: 320, overflow: 'hidden' }}
          onClick={handlePhotoClick}
          className="photo-area"
        >
          {dog.photo_path ? (
            <img src={dog.photo_path} alt={dog.name} style={{ width: '100%', objectFit: 'cover', display: 'block', maxHeight: 320 }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2 .336-3.5 2.098-3.5 4 0 .801.07 1.6.14 2.4C3 11.5 3 13 3 13.5c0 2.5 2 4.5 4.5 4.5S12 16 12 13.5c0-.5.14-1.94.14-1.94"/>
                <path d="M14.836 5C14.836 3.67 16.165 2.62 17.836 3c1.78.397 2.996 2.098 2.996 4 0 .758-.07 1.486-.14 2.2l.144.3"/>
                <circle cx="17" cy="15" r="2.5"/>
                <path d="M14.5 13.5v-2"/>
              </svg>
            </div>
          )}
          <div className="photo-overlay" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0)', transition: 'background 150ms' }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, background: 'rgba(0,0,0,0.5)', padding: '6px 14px', borderRadius: 50, opacity: 0 }} className="photo-label">
              {uploadingPhoto ? 'Uploading…' : 'Change photo'}
            </span>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />

        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,28px)', margin: 0, fontWeight: 400, color: 'var(--text)' }}>{dog.name}</h1>
              {dog.breed && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 8px' }}>{dog.breed}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ageLabel && <Pill color="green">{ageLabel}</Pill>}
                {dog.sex && <Pill color="blue">{dog.sex}</Pill>}
                {dog.neutered !== null && dog.neutered !== undefined && <Pill color={dog.neutered ? 'purple' : 'amber'}>{dog.neutered ? 'Neutered' : 'Intact'}</Pill>}
                {dog.energy_level && <Pill color="gold">{dog.energy_level} energy</Pill>}
                {dog.is_solo && <Pill color="amber">Solo</Pill>}
                {dog.archived && <Pill color="neutral">Archived</Pill>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Btn size="sm" variant="ghost" onClick={handleToggleSolo}>
                {dog.is_solo ? 'Unset Solo' : 'Set Solo'}
              </Btn>
              {dog.archived ? (
                <Btn size="sm" variant="secondary" onClick={handleUnarchive} disabled={archiving}>{archiving ? 'Restoring…' : 'Unarchive'}</Btn>
              ) : (
                <Btn size="sm" variant="secondary" onClick={handleArchive} disabled={archiving}>{archiving ? 'Archiving…' : 'Archive'}</Btn>
              )}
              <Btn size="sm" href={`/dogs/${dog.id}/edit`}>Edit</Btn>
            </div>
          </div>
        </div>
      </Card>

      {/* Archived banner */}
      {dog.archived && (
        <div style={{ background: 'var(--tint-amber)', border: '1px solid var(--tint-amber-text)', borderRadius: 10, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--tint-amber-text)', margin: 0 }}>This dog is archived</p>
            <p style={{ fontSize: 11, color: 'var(--tint-amber-text)', opacity: 0.8, margin: 0 }}>Hidden from active lists — all data preserved.</p>
          </div>
          <Btn size="sm" variant="secondary" onClick={handleUnarchive} disabled={archiving}>{archiving ? 'Restoring…' : 'Unarchive'}</Btn>
        </div>
      )}

      {/* Tabs */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', overflowX: 'auto', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'var(--border)' }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flexShrink: 0, padding: '12px 16px', fontSize: 12, fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? 'var(--cta-purple)' : 'var(--text-muted)',
                background: 'none', border: 'none',
                borderBottomWidth: 2,
                borderBottomStyle: 'solid',
                borderBottomColor: activeTab === tab ? 'var(--cta-purple)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.06em',
                transition: 'color 150ms',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ padding: '16px 18px' }}>
          {activeTab === 'Profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <FieldGrid>
                {dog.energy_level && <Field label="Energy Level" value={dog.energy_level} />}
                {dog.off_lead && <Field label="Off-Lead" value={dog.off_lead} />}
                {dog.gets_along_with_cats && <Field label="Gets Along With Cats" value={dog.gets_along_with_cats} />}
                {dog.good_with_children && <Field label="Good With Children" value={dog.good_with_children} />}
              </FieldGrid>
              {dog.special_behaviours && (
                <div style={{ marginTop: 12 }}>
                  <Field label="Special Behaviours / Triggers" value={dog.special_behaviours} />
                </div>
              )}
              <DogConflictsSection dogId={dog.id} allDogs={allDogs} />
              <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />
              <FieldGrid>
                {dog.exercise_needs && <Field label="Exercise Needs" value={dog.exercise_needs} />}
                {dog.sleeping_arrangements && <Field label="Sleeping Arrangements" value={dog.sleeping_arrangements} />}
                {dog.favourite_activities && <Field label="Favourite Activities" value={dog.favourite_activities} />}
                {dog.dog_commands && <Field label="Dog Commands" value={dog.dog_commands} />}
              </FieldGrid>
              <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />
              <FieldGrid>
                {dog.feeding_schedule && <Field label="Feeding Schedule" value={dog.feeding_schedule} />}
                {dog.food_type && <Field label="Food Type / Brand" value={dog.food_type} />}
                {dog.portion_size && <Field label="Portion Size" value={dog.portion_size} />}
                {dog.treats_allowed && <Field label="Treats Allowed" value={dog.treats_allowed} />}
                {dog.food_and_treats && <Field label="Food & Treats Notes" value={dog.food_and_treats} />}
                {dog.dietary_requirements && <Field label="Dietary Requirements" value={dog.dietary_requirements} />}
              </FieldGrid>
              <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />
              <FieldGrid>
                {dog.vaccination_date && <Field label="Vaccination Date" value={dog.vaccination_date} />}
                {dog.flea_worm_date && <Field label="Flea & Worm Treatment" value={dog.flea_worm_date} />}
                {dog.medical_requirements && <Field label="Medical Requirements" value={dog.medical_requirements} />}
                {dog.microchip_number && <Field label="Microchip Number" value={dog.microchip_number} />}
              </FieldGrid>
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
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No contacts added yet.</p>
              )}
              <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />
              {consentActivities.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 8 }}>Consented Daily Activities</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {consentActivities.map((item, i) => <Pill key={i} color="green">{item}</Pill>)}
                  </div>
                </div>
              )}
              {dog.concerns_daily_activities && <Field label="Concerns About Daily Activities" value={dog.concerns_daily_activities} />}
              {equipmentProvided.length > 0 && (
                <div style={{ margin: '14px 0' }}>
                  <p style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 8 }}>Equipment Provided by Owner</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {equipmentProvided.map((item, i) => <Pill key={i} color="blue">{item}</Pill>)}
                  </div>
                </div>
              )}
              {equipmentWdc.length > 0 && (
                <div style={{ margin: '14px 0' }}>
                  <p style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 8 }}>Equipment Provided by WDC</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {equipmentWdc.map((item, i) => <Pill key={i} color="purple">{item}</Pill>)}
                  </div>
                </div>
              )}
              {dog.consent_social_media && <Field label="Social Media Consent" value={dog.consent_social_media} />}
              {dog.consent_communication && <Field label="Preferred Communication" value={dog.consent_communication} />}
              <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />
              <label style={{ display: 'block', marginBottom: 6 }}>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder="Add any notes about this dog…" style={{ width: '100%', resize: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <Btn onClick={handleSaveNotes} disabled={savingNotes}>{savingNotes ? 'Saving…' : 'Save Notes'}</Btn>
                {notesSaved && <span style={{ fontSize: 12, color: 'var(--status-available)' }}>Saved!</span>}
              </div>
            </div>
          )}

          {activeTab === 'Bookings & Trials' && (
            <div>
              <DogBookingsTab dogId={parseInt(id)} dogName={dog.name} />
              <div style={{ borderTop: '1px solid var(--border)', margin: '24px 0' }} />
              <DogTrialsTab dogId={parseInt(id)} />
            </div>
          )}

          {activeTab === 'Invoices' && <DogInvoicesTab dogId={parseInt(id)} />}
          {activeTab === 'Incidents' && <DogIncidentsTab dogId={parseInt(id)} />}
        </div>
      </Card>

      {/* Delete */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', paddingBottom: 32 }}>
        <button onClick={handleDelete} disabled={deleting}
          style={{ fontSize: 12, color: 'var(--tint-red-text)', background: 'none', border: '1px solid var(--tint-red-text)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}>
          {deleting ? 'Deleting…' : 'Delete Dog Profile'}
        </button>
      </div>

      <style>{`
        .photo-area:hover .photo-overlay { background: rgba(0,0,0,0.2) !important; }
        .photo-area:hover .photo-label { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
