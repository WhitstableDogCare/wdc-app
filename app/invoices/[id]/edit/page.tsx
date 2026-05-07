'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { PageHead, Btn } from '../../../components/ui'

interface DogSummary {
  id: number
  name: string
  breed: string | null
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

const SERVICE_PRESETS = [
  { name: 'Half Day Care', detail: 'max 4 hours', standard: 20, peak: 25, type: 'daycare' as const },
  { name: 'Full Day Care', detail: 'max 8 hours', standard: 30, peak: 40, type: 'daycare' as const },
  { name: 'Long Day Care', detail: 'max 12 hours', standard: 40, peak: 50, type: 'daycare' as const },
  { name: 'Overnight Care', detail: '12–24 hours', standard: 50, peak: 60, type: 'boarding' as const },
]

function uid() { return Math.random().toString(36).slice(2) }

function calcNights(s: ServiceLine): number {
  if (s.type !== 'boarding' || !s.startDate || !s.endDate) return s.quantity
  return Math.max(0, Math.round((new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 86400000))
}

function serviceAmount(s: ServiceLine): number { return calcNights(s) * s.rate }

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-label)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
      {children}
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'var(--font-label)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{title}</span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [dogs, setDogs] = useState<DogSummary[]>([])
  const [selectedDogId, setSelectedDogId] = useState<string>('')
  const [form, setForm] = useState({
    dog_name: '', dog_breed: '', client_name: '', client_email: '',
    client_phone: '', client_address: '', invoice_date: '', due_date: '', notes: '',
  })
  const [services, setServices] = useState<ServiceLine[]>([])
  const [applyDiscount, setApplyDiscount] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/dogs').then(r => r.json()),
      fetch(`/api/invoices/${id}`).then(r => r.json()),
    ]).then(([dogsData, invoice]) => {
      setDogs(dogsData)
      setSelectedDogId(invoice.dog_id ? String(invoice.dog_id) : '')
      setForm({
        dog_name: invoice.dog_name ?? '',
        dog_breed: invoice.dog_breed ?? '',
        client_name: invoice.client_name ?? '',
        client_email: invoice.client_email ?? '',
        client_phone: invoice.client_phone ?? '',
        client_address: invoice.client_address ?? '',
        invoice_date: invoice.invoice_date ?? '',
        due_date: invoice.due_date ?? '',
        notes: invoice.notes ?? '',
      })
      setServices(JSON.parse(invoice.services ?? '[]'))
      setApplyDiscount(invoice.apply_discount ?? false)
      setLoading(false)
    })
  }, [id])

  const addService = (preset: typeof SERVICE_PRESETS[number], rateType: 'standard' | 'peak') => {
    const today = new Date().toISOString().split('T')[0]
    setServices(prev => [...prev, {
      id: uid(), type: preset.type,
      description: `${preset.name} (${rateType === 'peak' ? 'Peak Rate' : 'Standard Rate'})`,
      startDate: today, endDate: preset.type === 'boarding' ? today : '',
      quantity: 1, rate: rateType === 'peak' ? preset.peak : preset.standard,
    }])
  }

  const updateService = (sid: string, patch: Partial<ServiceLine>) =>
    setServices(prev => prev.map(s => s.id === sid ? { ...s, ...patch } : s))
  const removeService = (sid: string) =>
    setServices(prev => prev.filter(s => s.id !== sid))

  const subtotal = services.reduce((sum, s) => sum + serviceAmount(s), 0)
  const total = applyDiscount ? subtotal * 0.9 : subtotal

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dog_id: selectedDogId ? parseInt(selectedDogId) : null,
        ...form, services, apply_discount: applyDiscount, total,
      }),
    })
    router.push(`/invoices/${id}`)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Loading…</div>
  )

  return (
    <div style={{ maxWidth: 720 }}>
      <PageHead title="Edit Invoice">
        <Btn href={`/invoices/${id}`} variant="secondary">Cancel</Btn>
      </PageHead>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Section title="Dog">
          <select value={selectedDogId} onChange={e => setSelectedDogId(e.target.value)} style={{ width: '100%' }}>
            <option value="">— Select a dog —</option>
            {dogs.map(d => <option key={d.id} value={d.id}>{d.name}{d.breed ? ` (${d.breed})` : ''}</option>)}
          </select>
        </Section>

        <Section title="Client Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { key: 'dog_name', label: 'Dog Name' }, { key: 'dog_breed', label: 'Breed' },
              { key: 'client_name', label: 'Owner Name' }, { key: 'client_email', label: 'Email' },
              { key: 'client_phone', label: 'Phone' },
            ].map(({ key, label }) => (
              <div key={key}>
                <FieldLabel>{label}</FieldLabel>
                <input type="text" value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1' }}>
              <FieldLabel>Address</FieldLabel>
              <textarea value={form.client_address} onChange={e => setForm(f => ({ ...f, client_address: e.target.value }))} rows={2} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
          </div>
        </Section>

        <Section title="Invoice Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel>Invoice Date</FieldLabel>
              <input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <FieldLabel>Due Date</FieldLabel>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
        </Section>

        <Section title="Services">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {SERVICE_PRESETS.map(preset => (
              <div key={preset.name} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'var(--surface-3)' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{preset.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{preset.detail}</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => addService(preset, 'standard')} style={{ background: 'var(--cta-purple)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-label)', whiteSpace: 'nowrap' }}>£{preset.standard}</button>
                  <button onClick={() => addService(preset, 'peak')} style={{ background: 'var(--tint-gold-text)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-label)', whiteSpace: 'nowrap' }}>£{preset.peak} peak</button>
                </div>
              </div>
            ))}
          </div>
          {services.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {services.map(s => (
                <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', background: 'var(--surface-3)' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input type="text" value={s.description} onChange={e => updateService(s.id, { description: e.target.value })} style={{ flex: 1, boxSizing: 'border-box' }} />
                    <button onClick={() => removeService(s.id)} style={{ background: 'none', border: 'none', color: 'var(--tint-red-text)', cursor: 'pointer', fontSize: 14, padding: '0 6px' }}>✕</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Start Date</label>
                      <input type="date" value={s.startDate} onChange={e => updateService(s.id, { startDate: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', fontSize: 12 }} />
                    </div>
                    {s.type === 'boarding' ? (
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>End Date</label>
                        <input type="date" value={s.endDate} onChange={e => updateService(s.id, { endDate: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', fontSize: 12 }} />
                      </div>
                    ) : (
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Days</label>
                        <input type="number" min={1} value={s.quantity} onChange={e => updateService(s.id, { quantity: parseInt(e.target.value) || 1 })} style={{ width: '100%', boxSizing: 'border-box', fontSize: 12 }} />
                      </div>
                    )}
                    <div>
                      <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Rate (£)</label>
                      <input type="number" min={0} step={0.01} value={s.rate} onChange={e => updateService(s.id, { rate: parseFloat(e.target.value) || 0 })} style={{ width: '100%', boxSizing: 'border-box', fontSize: 12 }} />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>£{serviceAmount(s).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Notes & Options">
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Any additional notes…" style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', marginBottom: 12 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
            <input type="checkbox" checked={applyDiscount} onChange={e => setApplyDiscount(e.target.checked)} style={{ width: 16, height: 16 }} />
            Apply 10% loyalty discount
          </label>
        </Section>

        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            {applyDiscount && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 2px' }}>Subtotal: £{subtotal.toFixed(2)}</p>}
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Total: £{total.toFixed(2)}</p>
          </div>
          <Btn onClick={handleSave} disabled={saving} variant="primary">
            {saving ? 'Saving…' : 'Save Changes'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
