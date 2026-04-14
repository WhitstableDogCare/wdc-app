'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

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

  if (!incident) return <div className="p-8 text-gray-400 text-sm">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition-colors">
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-800">Incident Report</span>
              <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">⚠ Incident</span>
            </div>
            {incident.dog && (
              <a href={`/dogs/${incident.dog.id}`} className="text-sm text-[#2d6a4f] hover:underline">
                {incident.dog.name}
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm border border-gray-200 px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {editing ? (
        /* ── Edit mode ── */
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Dog</label>
            <select value={form.dog_id} onChange={e => set('dog_id', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]">
              <option value="">— None —</option>
              {dogs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Completed by</label>
            <input type="text" value={form.completed_by} onChange={e => set('completed_by', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
              <input type="date" value={form.incident_date} onChange={e => set('incident_date', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Time</label>
              <input type="time" value={form.incident_time} onChange={e => set('incident_time', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
            <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Staff witnesses</label>
            <input type="text" value={form.witnesses} onChange={e => set('witnesses', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Root causes</label>
            <textarea value={form.root_causes} onChange={e => set('root_causes', e.target.value)} rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Prevention measures</label>
            <textarea value={form.prevention_measures} onChange={e => set('prevention_measures', e.target.value)} rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-[#2d6a4f] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#245a41] transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => setEditing(false)}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* ── View mode ── */
        <div className="space-y-6">
          {/* Meta */}
          <div className="bg-gray-50 rounded-2xl p-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</span>
              <p className="text-gray-800 mt-0.5 font-medium">{fmt(incident.incident_date)}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Time</span>
              <p className="text-gray-800 mt-0.5 font-medium">{incident.incident_time ?? '—'}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Location</span>
              <p className="text-gray-800 mt-0.5">{incident.location ?? '—'}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Completed by</span>
              <p className="text-gray-800 mt-0.5">{incident.completed_by ?? '—'}</p>
            </div>
            {incident.witnesses && (
              <div className="col-span-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Staff witnesses</span>
                <p className="text-gray-800 mt-0.5">{incident.witnesses}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">Description of the incident</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-white border border-gray-100 rounded-xl p-4">
              {incident.description || <span className="text-gray-400">No description recorded.</span>}
            </p>
          </div>

          {/* Root causes */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">Root causes</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-white border border-gray-100 rounded-xl p-4">
              {incident.root_causes || <span className="text-gray-400">Not recorded.</span>}
            </p>
          </div>

          {/* Prevention */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">Matters undertaken to prevent recurrence</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-white border border-gray-100 rounded-xl p-4">
              {incident.prevention_measures || <span className="text-gray-400">Not recorded.</span>}
            </p>
          </div>

          {/* Delete */}
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button onClick={handleDelete} disabled={deleting}
              className="text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-4 py-2 rounded-lg transition-colors">
              {deleting ? 'Deleting...' : 'Delete Incident Report'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
