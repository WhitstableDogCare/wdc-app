'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SERVICE_PRESETS, ServiceLine, addDays, serviceAmount, inferPresetFromTimes, buildServiceLines } from '@/lib/invoice-utils'
import { PageHead, Btn } from '../../components/ui'

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

function uid() { return Math.random().toString(36).slice(2) }

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

function NewInvoiceInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedDogId = searchParams.get('dogId')
  const preselectedBookingId = searchParams.get('bookingId')

  const [dogs, setDogs] = useState<DogSummary[]>([])
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

  const loadFromBooking = useCallback(async (bookingId: string) => {
    const res = await fetch(`/api/bookings/${bookingId}`)
    const booking = await res.json()
    if (booking.dog?.id) {
      setSelectedDogId(String(booking.dog.id))
      await loadDog(String(booking.dog.id))
    } else {
      setForm(f => ({
        ...f,
        dog_name: booking.dog_name ?? '',
        client_name: booking.owner_name ?? '',
        client_email: booking.owner_email ?? '',
      }))
    }
    const isBoarding = booking.booking_type === 'Boarding'
    const preset = inferPresetFromTimes(booking.drop_off_time, booking.pick_up_time, isBoarding)
    if (preset) {
      setServices(buildServiceLines(preset, booking, uid))
    }
  }, [loadDog])

  useEffect(() => {
    if (preselectedBookingId) loadFromBooking(preselectedBookingId)
    else if (preselectedDogId) loadDog(preselectedDogId)
  }, [preselectedBookingId, preselectedDogId, loadFromBooking, loadDog])

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
        ...form, services, apply_discount: applyDiscount, total,
      }),
    })
    const invoice = await res.json()
    router.push(`/invoices/${invoice.id}`)
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <PageHead title="New Invoice">
        <Btn href="/bookings" variant="secondary">Cancel</Btn>
      </PageHead>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Dog selector */}
        <Section title="Dog">
          <select value={selectedDogId} onChange={e => handleDogChange(e.target.value)} style={{ width: '100%' }}>
            <option value="">— Select a dog —</option>
            {dogs.map(d => (
              <option key={d.id} value={d.id}>{d.name}{d.breed ? ` (${d.breed})` : ''}</option>
            ))}
          </select>
        </Section>

        {/* Client info */}
        <Section title="Client Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { key: 'dog_name', label: 'Dog Name' },
              { key: 'dog_breed', label: 'Breed' },
              { key: 'client_name', label: 'Owner Name' },
              { key: 'client_email', label: 'Email' },
              { key: 'client_phone', label: 'Phone' },
            ].map(({ key, label }) => (
              <div key={key}>
                <FieldLabel>{label}</FieldLabel>
                <input
                  type="text"
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1' }}>
              <FieldLabel>Address</FieldLabel>
              <textarea
                value={form.client_address}
                onChange={e => setForm(f => ({ ...f, client_address: e.target.value }))}
                rows={2}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
          </div>
        </Section>

        {/* Invoice dates */}
        <Section title="Invoice Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel>Invoice Date</FieldLabel>
              <input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value, due_date: addDays(e.target.value, 7) }))} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <FieldLabel>Due Date</FieldLabel>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
        </Section>

        {/* Services */}
        <Section title="Services">
          {/* Presets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {SERVICE_PRESETS.map(preset => (
              <div key={preset.name} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'var(--surface-3)' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{preset.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{preset.detail}</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => addService(preset, 'standard')}
                    style={{ background: 'var(--cta-purple)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-label)', whiteSpace: 'nowrap' }}
                  >
                    £{preset.standard}
                  </button>
                  <button
                    onClick={() => addService(preset, 'peak')}
                    style={{ background: 'var(--tint-gold-text)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-label)', whiteSpace: 'nowrap' }}
                  >
                    £{preset.peak} peak
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Service lines */}
          {services.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {services.map(s => (
                <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', background: 'var(--surface-3)' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      type="text"
                      value={s.description}
                      onChange={e => updateService(s.id, { description: e.target.value })}
                      style={{ flex: 1, boxSizing: 'border-box' }}
                    />
                    <button
                      onClick={() => removeService(s.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--tint-red-text)', cursor: 'pointer', fontSize: 14, padding: '0 6px' }}
                    >
                      ✕
                    </button>
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
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      £{serviceAmount(s).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Notes + discount */}
        <Section title="Notes & Options">
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            placeholder="Any additional notes…"
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', marginBottom: 12 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
            <input type="checkbox" checked={applyDiscount} onChange={e => setApplyDiscount(e.target.checked)} style={{ width: 16, height: 16 }} />
            Apply 10% loyalty discount
          </label>
        </Section>

        {/* Total + save */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--density-radius-card)', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            {applyDiscount && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 2px' }}>Subtotal: £{subtotal.toFixed(2)}</p>
            )}
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Total: £{total.toFixed(2)}</p>
          </div>
          <Btn onClick={handleSave} disabled={saving} variant="primary">
            {saving ? 'Saving…' : 'Save Invoice'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Loading…</div>}>
      <NewInvoiceInner />
    </Suspense>
  )
}
