export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import PrintButton from './PrintButton'

function calcAge(birthDate: string | null, age: number | null): string {
  if (birthDate) {
    const diff = Date.now() - new Date(birthDate).getTime()
    const years = diff / (1000 * 60 * 60 * 24 * 365.25)
    return years < 1 ? `${Math.round(years * 12)} months` : `${years.toFixed(1)} years`
  }
  if (age) return `${age} years`
  return '—'
}

function fmt(val: string | null | undefined): string {
  return val || '—'
}

function fmtDate(val: string | null | undefined): string {
  if (!val) return '—'
  try { return new Date(val).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return val }
}

function fmtDatetime(val: string | null | undefined): string {
  if (!val) return '—'
  try { return new Date(val).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return val }
}

function parseArr(val: string | null | undefined): string[] {
  if (!val) return []
  try { return JSON.parse(val) } catch { return [] }
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value || value === '—') return null
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12 }}>
      <span style={{ color: '#666', minWidth: 160, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#111' }}>{value}</span>
    </div>
  )
}

function Section({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#2d6a4f', borderBottom: '1px solid #e5e7eb', paddingBottom: 4, marginBottom: 8, marginTop: 16 }}>
      {title}
    </div>
  )
}

export default async function ExportPage() {
  const dogs = await prisma.dog.findMany({
    where: { archived: false },
    include: {
      owners: true,
      vets: true,
      buddies: true,
      trial_reviews: { orderBy: { created_at: 'asc' } },
      incidents: { orderBy: { incident_date: 'desc' } },
    },
    orderBy: { name: 'asc' },
  })

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .screen-only { }
        @media print {
          header, .screen-only { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }
          .dog-card { page-break-after: always; }
          .dog-card:last-child { page-break-after: avoid; }
        }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; margin-right: 4px; }
        .badge-green { background: #d1fae5; color: #065f46; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .badge-yellow { background: #fef3c7; color: #92400e; }
        .badge-gray { background: #f3f4f6; color: #6b7280; }
        .chip { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; border: 1px solid #d1fae5; background: #f0fdf4; color: #166534; margin: 2px; }
      `}</style>

      {/* Print button — screen only */}
      <div className="screen-only" style={{ background: '#2d6a4f', color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600 }}>Dog Profiles — Print / Save as PDF</span>
        <PrintButton />
      </div>

      <div style={{ padding: '24px 32px' }}>
          {/* Cover */}
          <div style={{ marginBottom: 32, paddingBottom: 16, borderBottom: '2px solid #2d6a4f' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#2d6a4f' }}>Whitstable Dog Care</div>
            <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>Dog Profiles Export — {today}</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{dogs.length} dog{dogs.length !== 1 ? 's' : ''}</div>
          </div>

          {dogs.map((dog) => {
            const age = calcAge(dog.birth_date, dog.age)
            const consents = parseArr(dog.consent_daily_activities)
            const equipOwner = parseArr(dog.equipment_provided)
            const equipWdc = parseArr(dog.equipment_wdc)
            const passedBoarding = dog.trial_reviews.some(t => t.trial_type === 'Boarding' && t.outcome === 'Passed')
            const passedDaycare = dog.trial_reviews.some(t => t.outcome === 'Passed')
            const failedBoarding = !passedBoarding && dog.trial_reviews.some(t => t.trial_type === 'Boarding' && t.outcome === 'Failed')
            const failedDaycare = !passedDaycare && dog.trial_reviews.some(t => t.outcome === 'Failed')

            return (
              <div key={dog.id} className="dog-card" style={{ marginBottom: 48 }}>
                {/* Dog header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>{dog.name}</div>
                    {dog.breed && <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{dog.breed}</div>}
                    <div style={{ marginTop: 6 }}>
                      {passedBoarding && <span className="badge badge-green">✓ Boarding</span>}
                      {passedDaycare && <span className="badge badge-yellow">✓ Daycare</span>}
                      {failedBoarding && <span className="badge badge-red">✗ Boarding</span>}
                      {failedDaycare && <span className="badge badge-red">✗ Daycare</span>}
                      {dog.trial_reviews.length === 0 && <span className="badge badge-gray">No trial</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#666' }}>
                    <div>Age: {age}</div>
                    {dog.birth_date && <div>Born: {fmtDate(dog.birth_date)}</div>}
                    {dog.sex && <div>{dog.sex}</div>}
                    {dog.neutered !== null && <div>{dog.neutered ? 'Neutered' : 'Not neutered'}</div>}
                    {dog.microchip_number && <div>Chip: {dog.microchip_number}</div>}
                  </div>
                </div>

                {/* Contacts */}
                {(dog.owners.length > 0 || dog.vets.length > 0 || dog.buddies.length > 0) && (
                  <>
                    <Section title="Contacts" />
                    {dog.owners.map((o, i) => (
                      <div key={o.id} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 2 }}>{i === 0 ? 'OWNER' : `OWNER ${i + 1}`}</div>
                        <Row label="Name" value={fmt(o.name)} />
                        <Row label="Phone" value={fmt(o.phone)} />
                        <Row label="Emergency Phone" value={fmt(o.emergency_phone)} />
                        <Row label="Email" value={fmt(o.email)} />
                        <Row label="Address" value={fmt(o.address)} />
                      </div>
                    ))}
                    {dog.vets.map((v, i) => (
                      <div key={v.id} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 2 }}>{i === 0 ? 'VET' : `VET ${i + 1}`}</div>
                        <Row label="Name" value={fmt(v.name)} />
                        <Row label="Phone" value={fmt(v.phone)} />
                        <Row label="Email" value={fmt(v.email)} />
                        <Row label="Address" value={fmt(v.address)} />
                      </div>
                    ))}
                    {dog.buddies.map((b) => (
                      <div key={b.id} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 2 }}>{b.is_primary ? 'PRIMARY BUDDY' : 'BUDDY'}</div>
                        <Row label="Name" value={fmt(b.name)} />
                        <Row label="Phone" value={fmt(b.phone)} />
                        <Row label="Email" value={fmt(b.email)} />
                      </div>
                    ))}
                  </>
                )}

                {/* Behaviour & Care */}
                <Section title="Behaviour & Care" />
                <Row label="Energy Level" value={fmt(dog.energy_level)} />
                <Row label="Off-Lead" value={fmt(dog.off_lead)} />
                <Row label="Gets Along With Cats" value={fmt(dog.gets_along_with_cats)} />
                <Row label="Good With Children" value={fmt(dog.good_with_children)} />
                <Row label="Special Behaviours" value={fmt(dog.special_behaviours)} />
                <Row label="Exercise Needs" value={fmt(dog.exercise_needs)} />
                <Row label="Sleeping Arrangements" value={fmt(dog.sleeping_arrangements)} />
                <Row label="Favourite Activities" value={fmt(dog.favourite_activities)} />
                <Row label="Dog Commands" value={fmt(dog.dog_commands)} />

                {/* Feeding & Health */}
                <Section title="Feeding & Health" />
                <Row label="Feeding Schedule" value={fmt(dog.feeding_schedule)} />
                <Row label="Food Type / Brand" value={fmt(dog.food_type)} />
                <Row label="Portion Size" value={fmt(dog.portion_size)} />
                <Row label="Treats Allowed" value={fmt(dog.treats_allowed)} />
                <Row label="Food & Treats Notes" value={fmt(dog.food_and_treats)} />
                <Row label="Dietary Requirements" value={fmt(dog.dietary_requirements)} />
                <Row label="Vaccination Date" value={fmtDate(dog.vaccination_date)} />
                <Row label="Flea & Worm Treatment" value={fmtDate(dog.flea_worm_date)} />
                <Row label="Medical Requirements" value={fmt(dog.medical_requirements)} />

                {/* Consents */}
                {(consents.length > 0 || equipOwner.length > 0 || equipWdc.length > 0 || dog.concerns_daily_activities || dog.consent_social_media || dog.consent_communication) && (
                  <>
                    <Section title="Consents & Equipment" />
                    {consents.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Consented Activities</div>
                        <div>{consents.map((c, i) => <span key={i} className="chip">{c}</span>)}</div>
                      </div>
                    )}
                    <Row label="Concerns" value={fmt(dog.concerns_daily_activities)} />
                    {equipOwner.length > 0 && <Row label="Equipment (Owner)" value={equipOwner.join(', ')} />}
                    {equipWdc.length > 0 && <Row label="Equipment (WDC)" value={equipWdc.join(', ')} />}
                    <Row label="Social Media" value={fmt(dog.consent_social_media)} />
                    <Row label="Communication" value={fmt(dog.consent_communication)} />
                  </>
                )}

                {/* Notes */}
                {dog.notes && (
                  <>
                    <Section title="Notes" />
                    <div style={{ fontSize: 12, color: '#111', whiteSpace: 'pre-wrap' }}>{dog.notes}</div>
                  </>
                )}

                {/* Trial Reviews */}
                {dog.trial_reviews.length > 0 && (
                  <>
                    <Section title="Trial Reviews" />
                    {dog.trial_reviews.map((t) => (
                      <div key={t.id} style={{ marginBottom: 16, padding: 10, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{t.trial_type} Trial</span>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
                            background: t.outcome === 'Passed' ? '#d1fae5' : t.outcome === 'Failed' ? '#fee2e2' : '#fef3c7',
                            color: t.outcome === 'Passed' ? '#065f46' : t.outcome === 'Failed' ? '#991b1b' : '#92400e',
                          }}>{t.outcome}</span>
                        </div>
                        <Row label="Date" value={t.start_datetime ? fmtDatetime(t.start_datetime) : fmtDate(t.log_date)} />
                        {t.end_datetime && <Row label="Ended" value={fmtDatetime(t.end_datetime)} />}
                        <Row label="Dogs Mixed With" value={fmt(t.dogs_mixed_with)} />
                        <Row label="Completed By" value={fmt(t.completed_by)} />
                        {t.behaviour_notes && <Row label="Behaviour" value={t.behaviour_notes} />}
                        {t.toileting_notes && <Row label="Toileting" value={t.toileting_notes} />}
                        {t.appetite_notes && <Row label="Appetite" value={t.appetite_notes} />}
                        {t.sleeping_notes && <Row label="Sleeping" value={t.sleeping_notes} />}
                        {t.walks_notes && <Row label="Walks" value={t.walks_notes} />}
                        {t.health_notes && <Row label="Health" value={t.health_notes} />}
                        {t.actions_notes && <Row label="Actions" value={t.actions_notes} />}
                      </div>
                    ))}
                  </>
                )}

                {/* Incidents */}
                {dog.incidents.length > 0 && (
                  <>
                    <Section title="Incident Reports" />
                    {dog.incidents.map((inc) => (
                      <div key={inc.id} style={{ marginBottom: 12, padding: 10, background: '#fff5f5', borderRadius: 8, border: '1px solid #fecaca' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 12, color: '#991b1b' }}>⚠ Incident</span>
                          <span style={{ fontSize: 11, color: '#666' }}>
                            {inc.incident_date ? fmtDate(inc.incident_date) : '—'}
                            {inc.incident_time ? ` at ${inc.incident_time}` : ''}
                          </span>
                        </div>
                        {inc.location && <Row label="Location" value={inc.location} />}
                        {inc.completed_by && <Row label="Completed by" value={inc.completed_by} />}
                        {inc.witnesses && <Row label="Witnesses" value={inc.witnesses} />}
                        {inc.description && (
                          <div style={{ marginTop: 6, fontSize: 12 }}>
                            <div style={{ color: '#666', fontWeight: 600, marginBottom: 2 }}>Description</div>
                            <div style={{ color: '#111', whiteSpace: 'pre-wrap' }}>{inc.description}</div>
                          </div>
                        )}
                        {inc.root_causes && (
                          <div style={{ marginTop: 6, fontSize: 12 }}>
                            <div style={{ color: '#666', fontWeight: 600, marginBottom: 2 }}>Root causes</div>
                            <div style={{ color: '#111', whiteSpace: 'pre-wrap' }}>{inc.root_causes}</div>
                          </div>
                        )}
                        {inc.prevention_measures && (
                          <div style={{ marginTop: 6, fontSize: 12 }}>
                            <div style={{ color: '#666', fontWeight: 600, marginBottom: 2 }}>Prevention measures</div>
                            <div style={{ color: '#111', whiteSpace: 'pre-wrap' }}>{inc.prevention_measures}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                <div style={{ borderBottom: '1px solid #e5e7eb', marginTop: 24 }} />
              </div>
            )
          })}
        </div>
    </>
  )
}
