'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Btn, Pill } from '../../components/ui'
import TimeSelect from '../../components/TimeSelect'

interface Incident {
  id: number
  dog_id: number | null
  dog: { id: number; name: string } | null
  completed_by: string | null
  incident_date: string | null
  incident_time: string | null
  location: string | null
  witnesses: string | null
  description: string | null
  root_causes: string | null
  prevention_measures: string | null
  created_at: string
}

interface Dog { id: number; name: string }

function fmt(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-label)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
      {children}
    </label>
  )
}

function TextBlock({ title, content }: { title: string; content: string | null }) {
  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', margin: 0 }}>
        {content || <span style={{ color: 'var(--text-muted)' }}>Not recorded.</span>}
      </p>
    </div>
  )
}

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [dogs, setDogs] = useState<Dog[]>([])
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch(`/api/incidents/${id}`).then(r => r.json()).then((data: Incident) => {
      setIncident(data)
      setForm({
        dog_id:              data.dog_id?.toString() ?? '',
        completed_by:        data.completed_by ?? '',
        incident_date:       data.incident_date ?? '',
        incident_time:       data.incident_time ?? '',
        location:            data.location ?? '',
        witnesses:           data.witnesses ?? '',
        description:         data.description ?? '',
        root_causes:         data.root_causes ?? '',
        prevention_measures: data.prevention_measures ?? '',
      })
    })
    fetch('/api/dogs').then(r => r.json()).then(setDogs)
  }, [id])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch(`/api/incidents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, dog_id: form.dog_id ? parseInt(form.dog_id) : null }),
    })
    const data = await res.json()
    setIncident(data)
    setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this incident report? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/incidents/${id}`, { method: 'DELETE' })
    router.push('/')
  }

  if (!incident) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Loading…</div>
  )

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', padding: 0 }}>
              ← Back
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--text)', margin: 0 }}>
              Incident Report
            </h1>
            <Pill color="red">Incident</Pill>
          </div>
          {incident.dog && (
            <Link href={`/dogs/${incident.dog.id}`} style={{ fontSize: 13, color: 'var(--cta-purple)', textDecoration: 'none', display: 'block', marginTop: 4 }}>
              {incident.dog.name}
            </Link>
          )}
        </div>
        {!editing && (
          <Btn onClick={() => setEditing(true)} variant="secondary">Edit</Btn>
        )}
      </div>

      {editing ? (
        /* Edit mode */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
            <FieldLabel>Dog</FieldLabel>
            <select value={form.dog_id} onChange={e => set('dog_id', e.target.value)} style={{ width: '100%' }}>
              <option value="">— None —</option>
              {dogs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
            <FieldLabel>Completed by</FieldLabel>
            <input type="text" value={form.completed_by} onChange={e => set('completed_by', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel>Date</FieldLabel>
              <input type="date" value={form.incident_date} onChange={e => set('incident_date', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <FieldLabel>Time</FieldLabel>
              <TimeSelect value={form.incident_time} onChange={v => set('incident_time', v)} />
            </div>
          </div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
            <FieldLabel>Location</FieldLabel>
            <input type="text" value={form.location} onChange={e => set('location', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
            <FieldLabel>Staff witnesses</FieldLabel>
            <input type="text" value={form.witnesses} onChange={e => set('witnesses', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
            <FieldLabel>Description</FieldLabel>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
            <FieldLabel>Root causes</FieldLabel>
            <textarea value={form.root_causes} onChange={e => set('root_causes', e.target.value)} rows={4} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18 }}>
            <FieldLabel>Prevention measures</FieldLabel>
            <textarea value={form.prevention_measures} onChange={e => set('prevention_measures', e.target.value)} rows={4} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, paddingBottom: 32 }}>
            <Btn onClick={handleSave} disabled={saving} variant="primary">
              {saving ? 'Saving…' : 'Save Changes'}
            </Btn>
            <Btn onClick={() => setEditing(false)} variant="secondary">Cancel</Btn>
          </div>
        </div>
      ) : (
        /* View mode */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Meta grid */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ fontFamily: 'var(--font-label)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 3px' }}>Date</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{fmt(incident.incident_date)}</p>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-label)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 3px' }}>Time</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{incident.incident_time ?? '—'}</p>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-label)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 3px' }}>Location</p>
              <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{incident.location ?? '—'}</p>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-label)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 3px' }}>Completed by</p>
              <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{incident.completed_by ?? '—'}</p>
            </div>
            {incident.witnesses && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontFamily: 'var(--font-label)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 3px' }}>Staff witnesses</p>
                <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{incident.witnesses}</p>
              </div>
            )}
          </div>

          <TextBlock title="Description of the incident" content={incident.description} />
          <TextBlock title="Root causes" content={incident.root_causes} />
          <TextBlock title="Matters undertaken to prevent recurrence" content={incident.prevention_measures} />

          {/* Delete */}
          <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', paddingBottom: 32 }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--font-label)', letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1,
                background: 'var(--tint-red)', color: 'var(--tint-red-text)',
                border: '1px solid var(--tint-red-text)',
              }}
            >
              {deleting ? 'Deleting…' : 'Delete Incident Report'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
