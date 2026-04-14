'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ContactFields {
  name: string
  phone: string
  emergency_phone: string
  address: string
  email: string
}

interface BuddyFields extends ContactFields {
  is_primary: boolean
}

interface DogFormData {
  name: string
  breed: string
  age: string
  birth_date: string
  sex: string
  neutered: string
  microchip_number: string
  gets_along_with_cats: string
  good_with_children: string
  energy_level: string
  special_behaviours: string
  feeding_schedule: string
  food_type: string
  portion_size: string
  treats_allowed: string
  exercise_needs: string
  off_lead: string
  favourite_activities: string
  sleeping_arrangements: string
  dog_commands: string
  food_and_treats: string
  dietary_requirements: string
  medical_requirements: string
  vaccination_date: string
  flea_worm_date: string
  consent_daily_activities: string[]
  concerns_daily_activities: string
  equipment_provided: string[]
  equipment_wdc: string[]
  notes: string
  owner: ContactFields
  vet: ContactFields
  buddy1: BuddyFields
  buddy2: BuddyFields
}

const emptyContact: ContactFields = { name: '', phone: '', emergency_phone: '', address: '', email: '' }

const CONSENT_OPTIONS = [
  'Off-lead garden exercise',
  'Feeding with dogs in separate areas',
  'Feeding with dogs together',
  'Outdoor areas',
  'On-lead walks',
  'Off-lead walks',
  'Daytime sleeping',
  'Boarding',
  'Sleeping with same household dogs',
  'Crate use',
]

const EQUIPMENT_OWNER_OPTIONS = ['Grooming equipment', 'Bed', 'Toys', 'Food bowl', 'Water bowl', 'Lead']
const EQUIPMENT_WDC_OPTIONS = ['Grooming Equipment', 'Bed', 'Toys', 'Food Bowl', 'Leads', 'Food', 'Treats']

interface DogFormProps {
  initialData?: Partial<DogFormData & { id?: number }>
  mode: 'create' | 'edit'
  dogId?: number
}

function FormField({
  label,
  children,
  required,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white'
const textareaClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white resize-none'
const selectClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white'

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-base font-bold text-[#2d6a4f] border-b border-green-100 pb-2 mb-4 mt-6 first:mt-0">
      {title}
    </h3>
  )
}

function ContactSection({
  title,
  value,
  onChange,
}: {
  title: string
  value: ContactFields
  onChange: (v: ContactFields) => void
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 mb-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Name</label>
          <input className={inputClass} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Phone</label>
          <input className={inputClass} type="tel" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Emergency Phone</label>
          <input className={inputClass} type="tel" value={value.emergency_phone} onChange={(e) => onChange({ ...value, emergency_phone: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Email</label>
          <input className={inputClass} type="email" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-gray-500 block mb-1">Address</label>
          <textarea className={textareaClass} rows={2} value={value.address} onChange={(e) => onChange({ ...value, address: e.target.value })} />
        </div>
      </div>
    </div>
  )
}

function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt))
    } else {
      onChange([...selected, opt])
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            className="accent-[#2d6a4f] w-4 h-4"
          />
          <span className="text-sm text-gray-700">{opt}</span>
        </label>
      ))}
    </div>
  )
}

function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) return parsed.map(String)
    return [String(parsed)]
  } catch {
    return val.split(',').map((s) => s.trim()).filter(Boolean)
  }
}

export default function DogForm({ initialData, mode, dogId }: DogFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const init = initialData || {}

  const [form, setForm] = useState<DogFormData>({
    name: (init as DogFormData).name || '',
    breed: (init as DogFormData).breed || '',
    age: (init as DogFormData).age?.toString() || '',
    birth_date: (init as DogFormData).birth_date || '',
    sex: (init as DogFormData).sex || '',
    neutered: (() => {
      const n = (init as unknown as { neutered?: boolean | string | null }).neutered
      if (n === null || n === undefined || n === '') return ''
      if (n === true || n === 'true') return 'true'
      if (n === false || n === 'false') return 'false'
      return ''
    })(),
    microchip_number: (init as DogFormData).microchip_number || '',
    gets_along_with_cats: (init as DogFormData).gets_along_with_cats || '',
    good_with_children: (init as DogFormData).good_with_children || '',
    energy_level: (init as DogFormData).energy_level || '',
    special_behaviours: (init as DogFormData).special_behaviours || '',
    feeding_schedule: (init as DogFormData).feeding_schedule || '',
    food_type: (init as DogFormData).food_type || '',
    portion_size: (init as DogFormData).portion_size || '',
    treats_allowed: (init as DogFormData).treats_allowed || '',
    exercise_needs: (init as DogFormData).exercise_needs || '',
    off_lead: (init as DogFormData).off_lead || '',
    favourite_activities: (init as DogFormData).favourite_activities || '',
    sleeping_arrangements: (init as DogFormData).sleeping_arrangements || '',
    dog_commands: (init as DogFormData).dog_commands || '',
    food_and_treats: (init as DogFormData).food_and_treats || '',
    dietary_requirements: (init as DogFormData).dietary_requirements || '',
    medical_requirements: (init as DogFormData).medical_requirements || '',
    vaccination_date: (init as DogFormData).vaccination_date || '',
    flea_worm_date: (init as DogFormData).flea_worm_date || '',
    consent_daily_activities: parseJsonArray((init as DogFormData).consent_daily_activities as unknown as string),
    concerns_daily_activities: (init as DogFormData).concerns_daily_activities || '',
    equipment_provided: parseJsonArray((init as DogFormData).equipment_provided as unknown as string),
    equipment_wdc: parseJsonArray((init as DogFormData).equipment_wdc as unknown as string),
    notes: (init as DogFormData).notes || '',
    owner: (init as DogFormData).owner || emptyContact,
    vet: (init as DogFormData).vet || emptyContact,
    buddy1: (init as DogFormData).buddy1 || { ...emptyContact, is_primary: true },
    buddy2: (init as DogFormData).buddy2 || { ...emptyContact, is_primary: false },
  })

  const set = (key: keyof DogFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Dog name is required')
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      name: form.name,
      breed: form.breed || null,
      birth_date: form.birth_date || null,
      age: form.age ? parseFloat(form.age) : null,
      sex: form.sex || null,
      neutered: form.neutered === 'true' ? true : form.neutered === 'false' ? false : null,
      microchip_number: form.microchip_number || null,
      gets_along_with_cats: form.gets_along_with_cats || null,
      good_with_children: form.good_with_children || null,
      energy_level: form.energy_level || null,
      special_behaviours: form.special_behaviours || null,
      feeding_schedule: form.feeding_schedule || null,
      food_type: form.food_type || null,
      portion_size: form.portion_size || null,
      treats_allowed: form.treats_allowed || null,
      exercise_needs: form.exercise_needs || null,
      off_lead: form.off_lead || null,
      favourite_activities: form.favourite_activities || null,
      sleeping_arrangements: form.sleeping_arrangements || null,
      dog_commands: form.dog_commands || null,
      food_and_treats: form.food_and_treats || null,
      dietary_requirements: form.dietary_requirements || null,
      medical_requirements: form.medical_requirements || null,
      vaccination_date: form.vaccination_date || null,
      flea_worm_date: form.flea_worm_date || null,
      consent_daily_activities: JSON.stringify(form.consent_daily_activities),
      concerns_daily_activities: form.concerns_daily_activities || null,
      equipment_provided: JSON.stringify(form.equipment_provided),
      equipment_wdc: JSON.stringify(form.equipment_wdc),
      notes: form.notes || null,
      owners: form.owner.name || form.owner.phone || form.owner.email ? [form.owner] : [],
      vets: form.vet.name || form.vet.phone || form.vet.email ? [form.vet] : [],
      buddies: [
        ...(form.buddy1.name || form.buddy1.phone ? [form.buddy1] : []),
        ...(form.buddy2.name || form.buddy2.phone ? [form.buddy2] : []),
      ],
    }

    try {
      let res
      if (mode === 'create') {
        res = await fetch('/api/dogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/dogs/${dogId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Save failed')
        setSaving(false)
        return
      }
      router.push(`/dogs/${data.id || dogId}`)
    } catch (err) {
      setError('Network error')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <SectionHeader title="Basic Information" />
        <FormField label="Dog's Name" required>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Buddy"
            required
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Breed">
            <input className={inputClass} value={form.breed} onChange={(e) => set('breed', e.target.value)} placeholder="e.g. Labrador" />
          </FormField>
          <FormField label="Date of Birth">
            <input className={inputClass} type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
            {form.birth_date && (() => {
              const diff = Date.now() - new Date(form.birth_date).getTime()
              const years = diff / (1000 * 60 * 60 * 24 * 365.25)
              return <p className="text-xs text-gray-400 mt-1">Age: {years < 1 ? `${Math.round(years * 12)} months` : `${years.toFixed(1)} years`}</p>
            })()}
          </FormField>
          <FormField label="Sex">
            <select className={selectClass} value={form.sex} onChange={(e) => set('sex', e.target.value)}>
              <option value="">Unknown</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </FormField>
          <FormField label="Neutered / Spayed">
            <select className={selectClass} value={form.neutered} onChange={(e) => set('neutered', e.target.value)}>
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </FormField>
        </div>
        <FormField label="Microchip Number">
          <input className={inputClass} value={form.microchip_number} onChange={(e) => set('microchip_number', e.target.value)} />
        </FormField>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <SectionHeader title="Profile" />
        <FormField label="Energy Level">
          <select className={selectClass} value={form.energy_level} onChange={(e) => set('energy_level', e.target.value)}>
            <option value="">Unknown</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </FormField>
        <FormField label="Gets Along With Cats">
          <select className={selectClass} value={form.gets_along_with_cats} onChange={(e) => set('gets_along_with_cats', e.target.value)}>
            <option value="">Unknown</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </FormField>
        <FormField label="Good With Children">
          <select className={selectClass} value={form.good_with_children} onChange={(e) => set('good_with_children', e.target.value)}>
            <option value="">Unknown</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </FormField>
        <FormField label="Off-Lead">
          <select className={selectClass} value={form.off_lead} onChange={(e) => set('off_lead', e.target.value)}>
            <option value="">Unknown</option>
            <option value="Yes">Yes</option>
            <option value="Working on it">Working on it</option>
            <option value="No">No</option>
          </select>
        </FormField>
        <FormField label="Special Behaviours / Triggers">
          <textarea className={textareaClass} rows={3} value={form.special_behaviours} onChange={(e) => set('special_behaviours', e.target.value)} placeholder="Any known triggers, fears, or special behaviours..." />
        </FormField>
      </div>

      {/* Feeding */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <SectionHeader title="Feeding" />
        <FormField label="Feeding Schedule">
          <input className={inputClass} value={form.feeding_schedule} onChange={(e) => set('feeding_schedule', e.target.value)} placeholder="e.g. Twice a day, 8am and 5pm" />
        </FormField>
        <FormField label="Food Type / Brand">
          <input className={inputClass} value={form.food_type} onChange={(e) => set('food_type', e.target.value)} placeholder="e.g. Royal Canin dry kibble" />
        </FormField>
        <FormField label="Portion Size">
          <input className={inputClass} value={form.portion_size} onChange={(e) => set('portion_size', e.target.value)} placeholder="e.g. 200g per meal" />
        </FormField>
        <FormField label="Treats Allowed">
          <input className={inputClass} value={form.treats_allowed} onChange={(e) => set('treats_allowed', e.target.value)} placeholder="e.g. Yes, only natural treats" />
        </FormField>
        <FormField label="Food & Treats Notes">
          <textarea className={textareaClass} rows={2} value={form.food_and_treats} onChange={(e) => set('food_and_treats', e.target.value)} />
        </FormField>
        <FormField label="Dietary Requirements">
          <textarea className={textareaClass} rows={2} value={form.dietary_requirements} onChange={(e) => set('dietary_requirements', e.target.value)} placeholder="Any allergies or special dietary needs..." />
        </FormField>
      </div>

      {/* Health */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <SectionHeader title="Health" />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Vaccination Date">
            <input className={inputClass} value={form.vaccination_date} onChange={(e) => set('vaccination_date', e.target.value)} placeholder="e.g. Jan 2024" />
          </FormField>
          <FormField label="Flea & Worm Treatment Date">
            <input className={inputClass} value={form.flea_worm_date} onChange={(e) => set('flea_worm_date', e.target.value)} placeholder="e.g. March 2024" />
          </FormField>
        </div>
        <FormField label="Medical Requirements">
          <textarea className={textareaClass} rows={3} value={form.medical_requirements} onChange={(e) => set('medical_requirements', e.target.value)} placeholder="Any medications, conditions, or special medical needs..." />
        </FormField>
      </div>

      {/* Care */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <SectionHeader title="Care" />
        <FormField label="Exercise Needs">
          <input className={inputClass} value={form.exercise_needs} onChange={(e) => set('exercise_needs', e.target.value)} placeholder="e.g. 2 walks a day, 30 min each" />
        </FormField>
        <FormField label="Sleeping Arrangements">
          <input className={inputClass} value={form.sleeping_arrangements} onChange={(e) => set('sleeping_arrangements', e.target.value)} placeholder="e.g. Crate, dog bed, sofa" />
        </FormField>
        <FormField label="Favourite Activities">
          <input className={inputClass} value={form.favourite_activities} onChange={(e) => set('favourite_activities', e.target.value)} placeholder="e.g. Fetch, tug of war, swimming" />
        </FormField>
        <FormField label="Dog Commands">
          <textarea className={textareaClass} rows={2} value={form.dog_commands} onChange={(e) => set('dog_commands', e.target.value)} placeholder="Any commands the dog knows..." />
        </FormField>
      </div>

      {/* Contacts */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <SectionHeader title="Contacts" />
        <ContactSection title="Owner" value={form.owner} onChange={(v) => set('owner', v)} />
        <ContactSection title="Vet" value={form.vet} onChange={(v) => set('vet', v)} />
        <ContactSection title="Buddy 1 (Primary)" value={form.buddy1} onChange={(v) => set('buddy1', { ...v, is_primary: true })} />
        <ContactSection title="Buddy 2 (Optional)" value={form.buddy2} onChange={(v) => set('buddy2', { ...v, is_primary: false })} />
      </div>

      {/* Consents */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <SectionHeader title="Consents & Equipment" />
        <FormField label="Consented Daily Activities">
          <CheckboxGroup
            options={CONSENT_OPTIONS}
            selected={form.consent_daily_activities}
            onChange={(v) => set('consent_daily_activities', v)}
          />
        </FormField>
        <FormField label="Concerns About Daily Activities">
          <textarea className={textareaClass} rows={2} value={form.concerns_daily_activities} onChange={(e) => set('concerns_daily_activities', e.target.value)} />
        </FormField>
        <FormField label="Equipment Provided by Owner">
          <CheckboxGroup
            options={EQUIPMENT_OWNER_OPTIONS}
            selected={form.equipment_provided}
            onChange={(v) => set('equipment_provided', v)}
          />
        </FormField>
        <FormField label="Equipment Provided by WDC">
          <CheckboxGroup
            options={EQUIPMENT_WDC_OPTIONS}
            selected={form.equipment_wdc}
            onChange={(v) => set('equipment_wdc', v)}
          />
        </FormField>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <SectionHeader title="Notes" />
        <textarea
          className={textareaClass}
          rows={4}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Any additional notes..."
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3 pb-8">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-[#2d6a4f] text-white py-3 rounded-xl font-semibold hover:bg-[#245a41] transition-colors disabled:opacity-60 text-sm"
        >
          {saving ? 'Saving...' : mode === 'create' ? 'Add Dog' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
