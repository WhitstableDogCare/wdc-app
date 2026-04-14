'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Dog { id: number; name: string }

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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition-colors">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-800">New Incident Report</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
        Complete this form when an unusual or unexpected event occurs — such as injury, escape, aggressive behaviour, or an emergency situation.
      </div>

      <div className="space-y-5">

        {/* Dog */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Dog</label>
          <select
            value={form.dog_id}
            onChange={e => set('dog_id', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
          >
            <option value="">— Select dog —</option>
            {dogs.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Completed by */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Completed by</label>
          <input
            type="text"
            value={form.completed_by}
            onChange={e => set('completed_by', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
          />
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Date of incident</label>
            <input
              type="date"
              value={form.incident_date}
              onChange={e => set('incident_date', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Time of incident</label>
            <input
              type="time"
              value={form.incident_time}
              onChange={e => set('incident_time', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Location of incident</label>
          <input
            type="text"
            value={form.location}
            onChange={e => set('location', e.target.value)}
            placeholder="e.g. Garden patio, front hallway..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
          />
        </div>

        {/* Staff witnesses */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Staff witnesses</label>
          <input
            type="text"
            value={form.witnesses}
            onChange={e => set('witnesses', e.target.value)}
            placeholder="Names of any staff present"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Brief description of the incident</label>
          <p className="text-xs text-gray-500 mb-1.5">Consider who, what, where, when and how.</p>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={5}
            placeholder="Describe what happened..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none"
          />
        </div>

        {/* Root causes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Root causes of the incident</label>
          <p className="text-xs text-gray-500 mb-1.5">Think beyond the obvious — why did this happen? Were procedures adequate? Was training sufficient?</p>
          <textarea
            value={form.root_causes}
            onChange={e => set('root_causes', e.target.value)}
            rows={4}
            placeholder="Identify the underlying causes..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none"
          />
        </div>

        {/* Prevention */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Matters undertaken to prevent recurrence</label>
          <textarea
            value={form.prevention_measures}
            onChange={e => set('prevention_measures', e.target.value)}
            rows={4}
            placeholder="What steps have been taken to prevent this happening again?"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#2d6a4f] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#245a41] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Incident Report'}
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
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
