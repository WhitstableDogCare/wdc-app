'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHead, Btn } from '../../components/ui'

interface Dog { id: number; name: string }

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-label)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
      {children}
    </label>
  )
}

function NewIncidentInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedDogId = searchParams.get('dogId')

  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toTimeString().slice(0, 5)

  const [dogs, setDogs] = useState<Dog[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    dog_id:              preselectedDogId ?? '',
    completed_by:        'Jack Rojas Powell',
    incident_date:       today,
    incident_time:       now,
    location:            '',
    witnesses:           '',
    description:         '',
    root_causes:         '',
    prevention_measures: '',
  })

  useEffect(() => {
    fetch('/api/dogs').then(r => r.json()).then(setDogs)
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, dog_id: form.dog_id ? parseInt(form.dog_id) : null }),
    })
    const data = await res.json()
    router.push(`/incidents/${data.id}`)
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <PageHead title="New Incident Report">
        <Btn onClick={() => router.back()} variant="secondary">Cancel</Btn>
      </PageHead>

      <div style={{ background: 'var(--tint-amber)', border: '1px solid var(--tint-amber-text)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--tint-amber-text)', marginBottom: 20, lineHeight: 1.5 }}>
        Complete this form when an unusual or unexpected event occurs — such as injury, escape, aggressive behaviour, or an emergency situation.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Dog */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
          <FieldLabel>Dog</FieldLabel>
          <select value={form.dog_id} onChange={e => set('dog_id', e.target.value)} style={{ width: '100%' }}>
            <option value="">— Select dog —</option>
            {dogs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {/* Completed by */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
          <FieldLabel>Completed by</FieldLabel>
          <input type="text" value={form.completed_by} onChange={e => set('completed_by', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>

        {/* Date & Time */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel>Date of incident</FieldLabel>
            <input type="date" value={form.incident_date} onChange={e => set('incident_date', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <FieldLabel>Time of incident</FieldLabel>
            <input type="time" value={form.incident_time} onChange={e => set('incident_time', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Location */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
          <FieldLabel>Location of incident</FieldLabel>
          <input type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Garden patio, front hallway…" style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>

        {/* Witnesses */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
          <FieldLabel>Staff witnesses</FieldLabel>
          <input type="text" value={form.witnesses} onChange={e => set('witnesses', e.target.value)} placeholder="Names of any staff present" style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>

        {/* Description */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
          <FieldLabel>Brief description of the incident</FieldLabel>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.5 }}>Consider who, what, where, when and how.</p>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5} placeholder="Describe what happened…" style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
        </div>

        {/* Root causes */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
          <FieldLabel>Root causes of the incident</FieldLabel>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.5 }}>Think beyond the obvious — why did this happen? Were procedures adequate? Was training sufficient?</p>
          <textarea value={form.root_causes} onChange={e => set('root_causes', e.target.value)} rows={4} placeholder="Identify the underlying causes…" style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
        </div>

        {/* Prevention */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
          <FieldLabel>Matters undertaken to prevent recurrence</FieldLabel>
          <textarea value={form.prevention_measures} onChange={e => set('prevention_measures', e.target.value)} rows={4} placeholder="What steps have been taken to prevent this happening again?" style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 10, paddingBottom: 32 }}>
          <Btn onClick={handleSave} disabled={saving} variant="primary">
            {saving ? 'Saving…' : 'Save Incident Report'}
          </Btn>
          <Btn onClick={() => router.back()} variant="secondary">Cancel</Btn>
        </div>
      </div>
    </div>
  )
}

export default function NewIncidentPage() {
  return (
    <Suspense>
      <NewIncidentInner />
    </Suspense>
  )
}
