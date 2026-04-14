'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface DogSummary {
  id: number
  name: string
  breed: string | null
}

interface DogDetail {
  id: number
  name: string
  breed: string | null
  owners: { name: string | null; email: string | null; phone: string | null; address: string | null }[]
}

interface ServiceLine {
  id: string
  type: 'boarding' | 'daycare'
  description: string
  startDate: string
  endDate: string
  quantity: number
  rate: number
}

interface Config {
  businessName?: string
  businessAddress?: string
  businessEmail?: string
  businessPhone?: string
  paymentInfo?: string
}

const SERVICE_PRESETS = [
  { name: 'Half Day Care', detail: 'max 4 hours', standard: 20, peak: 25, type: 'daycare' as const },
  { name: 'Full Day Care', detail: 'max 8 hours', standard: 30, peak: 40, type: 'daycare' as const },
  { name: 'Long Day Care', detail: 'max 12 hours', standard: 40, peak: 50, type: 'daycare' as const },
  { name: 'Overnight Care', detail: '12–24 hours', standard: 50, peak: 60, type: 'boarding' as const },
]

function uid() { return Math.random().toString(36).slice(2) }

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function calcNights(s: ServiceLine): number {
  if (s.type !== 'boarding' || !s.startDate || !s.endDate) return s.quantity
  const diff = Math.round((new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 86400000)
  return Math.max(0, diff)
}

function serviceAmount(s: ServiceLine): number {
  return calcNights(s) * s.rate
}

function NewInvoiceInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedDogId = searchParams.get('dogId')

  const [dogs, setDogs] = useState<DogSummary[]>([])
  const [config, setConfig] = useState<Config>({})
  const [selectedDogId, setSelectedDogId] = useState<string>(preselectedDogId ?? '')
  const [form, setForm] = useState({
    dog_name: '',
    dog_breed: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: addDays(new Date().toISOString().split('T')[0], 7),
    notes: '',
  })
  const [services, setServices] = useState<ServiceLine[]>([])
  const [applyDiscount, setApplyDiscount] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/dogs').then(r => r.json()).then(setDogs)
    fetch('/api/config').then(r => r.json()).then(setConfig)
  }, [])

  const loadDog = useCallback(async (dogId: string) => {
    if (!dogId) return
    const res = await fetch(`/api/dogs/${dogId}`)
    const dog: DogDetail = await res.json()
    const owner = dog.owners[0]
    setForm(f => ({
      ...f,
      dog_name: dog.name ?? '',
      dog_breed: dog.breed ?? '',
      client_name: owner?.name ?? '',
      client_email: owner?.email ?? '',
      client_phone: owner?.phone ?? '',
      client_address: owner?.address ?? '',
    }))
  }, [])

  useEffect(() => {
    if (preselectedDogId) loadDog(preselectedDogId)
  }, [preselectedDogId, loadDog])

  const handleDogChange = async (dogId: string) => {
    setSelectedDogId(dogId)
    if (dogId) await loadDog(dogId)
  }

  const addService = (preset: typeof SERVICE_PRESETS[number], rateType: 'standard' | 'peak') => {
    const today = new Date().toISOString().split('T')[0]
    const s: ServiceLine = {
      id: uid(),
      type: preset.type,
      description: `${preset.name} (${rateType === 'peak' ? 'Peak Rate' : 'Standard Rate'})`,
      startDate: today,
      endDate: preset.type === 'boarding' ? today : '',
      quantity: 1,
      rate: rateType === 'peak' ? preset.peak : preset.standard,
    }
    setServices(prev => [...prev, s])
  }

  const updateService = (id: string, patch: Partial<ServiceLine>) =>
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))

  const removeService = (id: string) =>
    setServices(prev => prev.filter(s => s.id !== id))

  const subtotal = services.reduce((sum, s) => sum + serviceAmount(s), 0)
  const total = applyDiscount ? subtotal * 0.9 : subtotal

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dog_id: selectedDogId ? parseInt(selectedDogId) : null,
        ...form,
        services,
        apply_discount: applyDiscount,
        total,
      }),
    })
    const invoice = await res.json()
    router.push(`/invoices/${invoice.id}`)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <a href="/invoices" className="text-sm text-[#2d6a4f] hover:underline">← Invoices</a>
        <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
      </div>

      <div className="space-y-4">
        {/* Dog selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Dog</h2>
          <select
            value={selectedDogId}
            onChange={e => handleDogChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
          >
            <option value="">— Select a dog —</option>
            {dogs.map(d => (
              <option key={d.id} value={d.id}>{d.name}{d.breed ? ` (${d.breed})` : ''}</option>
            ))}
          </select>
        </div>

        {/* Client info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Client Details</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { key: 'dog_name', label: 'Dog Name' },
              { key: 'dog_breed', label: 'Breed' },
              { key: 'client_name', label: 'Owner Name' },
              { key: 'client_email', label: 'Email' },
              { key: 'client_phone', label: 'Phone' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
                <input
                  type="text"
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Address</label>
              <textarea
                value={form.client_address}
                onChange={e => setForm(f => ({ ...f, client_address: e.target.value }))}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Invoice dates */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Invoice Date</label>
              <input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value, due_date: addDays(e.target.value, 7) }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Services</h2>

          {/* Presets */}
          <div className="grid grid-cols-1 gap-2 mb-4 sm:grid-cols-2">
            {SERVICE_PRESETS.map(preset => (
              <div key={preset.name} className="border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{preset.name}</p>
                  <p className="text-xs text-gray-400">{preset.detail}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => addService(preset, 'standard')} className="text-xs bg-[#2d6a4f] text-white px-2.5 py-1.5 rounded-lg hover:bg-[#245a41] transition-colors font-medium">
                    £{preset.standard}
                  </button>
                  <button onClick={() => addService(preset, 'peak')} className="text-xs bg-amber-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-amber-600 transition-colors font-medium">
                    £{preset.peak} peak
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Service lines */}
          {services.length > 0 && (
            <div className="space-y-3 mt-3">
              {services.map(s => (
                <div key={s.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                  <div className="flex items-start gap-2 mb-2">
                    <input
                      type="text"
                      value={s.description}
                      onChange={e => updateService(s.id, { description: e.target.value })}
                      className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                    />
                    <button onClick={() => removeService(s.id)} className="text-red-400 hover:text-red-600 text-sm px-2 py-1.5">✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Start Date</label>
                      <input type="date" value={s.startDate} onChange={e => updateService(s.id, { startDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
                    </div>
                    {s.type === 'boarding' && (
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">End Date</label>
                        <input type="date" value={s.endDate} onChange={e => updateService(s.id, { endDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
                      </div>
                    )}
                    {s.type === 'daycare' && (
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Days</label>
                        <input type="number" min={1} value={s.quantity} onChange={e => updateService(s.id, { quantity: parseInt(e.target.value) || 1 })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Rate (£)</label>
                      <input type="number" min={0} step={0.01} value={s.rate} onChange={e => updateService(s.id, { rate: parseFloat(e.target.value) || 0 })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
                    </div>
                    <div className="flex items-end">
                      <p className="text-sm font-semibold text-gray-800">£{serviceAmount(s).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes + discount */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Notes & Options</h2>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            placeholder="Any additional notes..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none mb-3"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={applyDiscount} onChange={e => setApplyDiscount(e.target.checked)} className="rounded" />
            Apply 10% loyalty discount
          </label>
        </div>

        {/* Total + save */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            {applyDiscount && (
              <p className="text-sm text-gray-500">Subtotal: £{subtotal.toFixed(2)}</p>
            )}
            <p className="text-xl font-bold text-gray-900">Total: £{total.toFixed(2)}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#2d6a4f] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#245a41] transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-500">Loading...</div>}>
      <NewInvoiceInner />
    </Suspense>
  )
}
