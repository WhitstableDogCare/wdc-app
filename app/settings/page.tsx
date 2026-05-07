'use client'

import { useState, useEffect } from 'react'
import { PageHead, Btn, Pill } from '../components/ui'

interface Config {
  businessName?: string
  businessAddress?: string
  businessEmail?: string
  businessPhone?: string
  paymentInfo?: string
  gmailAppPassword?: string
}

interface Submission {
  id: number
  submission_id: string
  dog_id: number | null
  raw_data: string
  imported_at: string
}

const DOG_NAME_QUESTION_ID = 'kGe6Md'

function parseSubmissionName(raw_data: string): string {
  try {
    const data = JSON.parse(raw_data)
    const responses = data.responses || []
    const r = responses.find((r: { questionId: string }) => r.questionId === DOG_NAME_QUESTION_ID)
    if (r?.answer) return String(r.answer).trim()
    return 'Unknown dog'
  } catch {
    return 'Unknown dog'
  }
}

function parseSubmissionDate(raw_data: string): string {
  try {
    const data = JSON.parse(raw_data)
    const date = data.createdAt || data.submittedAt || data.created_at
    if (date) return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {}
  return ''
}

// --- Layout helpers ---

function SectionCard({ title, children, badge }: { title: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--density-radius-card)',
      boxShadow: 'var(--sh-sm)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontFamily: 'var(--font-label)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {title}
        </span>
        {badge}
      </div>
      <div style={{ padding: '18px' }}>
        {children}
      </div>
    </div>
  )
}

function SettingRow({ label, hint, action, children }: { label: string; hint?: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{label}</p>
        {hint && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.5 }}>{hint}</p>}
        {children}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-label)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
      {children}
    </label>
  )
}

function SmallBtn({ onClick, disabled, children, variant = 'primary' }: {
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}) {
  const bg = variant === 'primary' ? 'var(--cta-purple)' : variant === 'danger' ? 'var(--tint-red)' : variant === 'ghost' ? 'var(--surface-3)' : 'var(--surface-3)'
  const color = variant === 'primary' ? '#fff' : variant === 'danger' ? 'var(--tint-red-text)' : 'var(--text)'
  const border = variant === 'secondary' ? '1px solid var(--border)' : 'none'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg, color, border, borderRadius: 'var(--density-radius-pill)',
        padding: '7px 14px', fontSize: 12, fontWeight: 600,
        fontFamily: 'var(--font-label)', letterSpacing: '0.06em', textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap', transition: 'opacity 150ms',
      }}
    >
      {children}
    </button>
  )
}

export default function SettingsPage() {
  // Business details
  const [form, setForm] = useState<Config>({
    businessName: '', businessAddress: '', businessEmail: '',
    businessPhone: '', paymentInfo: '', gmailAppPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [newAppPassword, setNewAppPassword] = useState('')
  const [showAppPassword, setShowAppPassword] = useState(false)
  const [savingAppPassword, setSavingAppPassword] = useState(false)
  const [savedAppPassword, setSavedAppPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [calConnected, setCalConnected] = useState(false)
  const [publicCalId, setPublicCalId] = useState('')
  const [savingPublicCal, setSavingPublicCal] = useState(false)
  const [savedPublicCal, setSavedPublicCal] = useState(false)
  const [syncingPublicCal, setSyncingPublicCal] = useState(false)
  const [syncPublicCalResult, setSyncPublicCalResult] = useState<string | null>(null)

  // Tally sync
  const [apiKey, setApiKey] = useState('')
  const [savedKey, setSavedKey] = useState(false)
  const [hasStoredKey, setHasStoredKey] = useState<boolean | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [newSubmissions, setNewSubmissions] = useState<Submission[]>([])
  const [syncDone, setSyncDone] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [importingId, setImportingId] = useState<number | null>(null)
  const [importingAll, setImportingAll] = useState(false)
  const [importResults, setImportResults] = useState<Record<number, { success: boolean; name?: string }>>({})
  const [cleaning, setCleaning] = useState(false)
  const [cleanResult, setCleanResult] = useState<string | null>(null)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillResult, setBackfillResult] = useState<string | null>(null)
  const [savingBackup, setSavingBackup] = useState(false)
  const [saveBackupResult, setSaveBackupResult] = useState<string | null>(null)
  const [resyncing, setResyncing] = useState(false)
  const [resyncResult, setResyncResult] = useState<string | null>(null)

  // Calendar import
  const [showCalImport, setShowCalImport] = useState(false)
  const [calImportPreviewing, setCalImportPreviewing] = useState(false)
  const [calImportImporting, setCalImportImporting] = useState(false)
  const [calImportPreview, setCalImportPreview] = useState<{
    ready: number; duplicate: number; unmatched: number; unmatchedNames: string[]
  } | null>(null)
  const [calImportResult, setCalImportResult] = useState<string | null>(null)
  const [calImportError, setCalImportError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('calauth') === 'success') setCalConnected(true)

    fetch('/api/config').then(r => r.json()).then(cfg => {
      if (cfg.googleRefreshToken) setCalConnected(true)
      if (cfg.publicGoogleCalendarId) setPublicCalId(cfg.publicGoogleCalendarId)
      setForm({
        businessName: cfg.businessName ?? '',
        businessAddress: cfg.businessAddress ?? '',
        businessEmail: cfg.businessEmail ?? '',
        businessPhone: cfg.businessPhone ?? '',
        paymentInfo: cfg.paymentInfo ?? '',
        gmailAppPassword: cfg.gmailAppPassword ?? '',
      })
      setLoading(false)
    })
    fetch('/api/tally/sync', { method: 'PUT' })
      .then(r => r.json())
      .then(d => setHasStoredKey(d.hasKey))
      .catch(() => setHasStoredKey(false))
  }, [])

  const handleSaveAppPassword = async () => {
    if (!newAppPassword.trim()) return
    setSavingAppPassword(true)
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appPassword: newAppPassword.trim() }),
    })
    setNewAppPassword('')
    setSavingAppPassword(false)
    setSavedAppPassword(true)
    setTimeout(() => setSavedAppPassword(false), 2500)
  }

  const handleSyncPublicCal = async () => {
    setSyncingPublicCal(true)
    setSyncPublicCalResult(null)
    const res = await fetch('/api/public-calendar/sync', { method: 'POST' })
    const data = await res.json()
    setSyncingPublicCal(false)
    if (data.error) setSyncPublicCalResult(`Error: ${data.error}`)
    else setSyncPublicCalResult(`Synced ${data.startDate} to ${data.endDate}`)
  }

  const handleSavePublicCal = async () => {
    setSavingPublicCal(true)
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicGoogleCalendarId: publicCalId.trim() || undefined }),
    })
    setSavingPublicCal(false)
    setSavedPublicCal(true)
    setTimeout(() => setSavedPublicCal(false), 2500)
  }

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return
    await fetch('/api/tally/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: apiKey.trim() }),
    })
    setSavedKey(true)
    setHasStoredKey(true)
    setTimeout(() => setSavedKey(false), 2000)
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncDone(false)
    setSyncError(null)
    setNewSubmissions([])
    setImportResults({})
    const res = await fetch('/api/tally/sync')
    const data = await res.json()
    if (data.error) {
      setSyncError(data.error)
    } else {
      setNewSubmissions((data.submissions || []).filter((s: Submission) => s.dog_id === null))
      setSyncDone(true)
    }
    setSyncing(false)
  }

  const importOne = async (sub: Submission): Promise<boolean> => {
    const res = await fetch(`/api/tally/import/${sub.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'import' }),
    })
    const data = await res.json()
    setImportResults(prev => ({ ...prev, [sub.id]: { success: data.success, name: data.dogName } }))
    return data.success
  }

  const handleImportAll = async () => {
    setImportingAll(true)
    for (const sub of newSubmissions.filter(s => !importResults[s.id])) {
      await importOne(sub)
    }
    setImportingAll(false)
  }

  const handleResync = async () => {
    if (!confirm('Re-run all existing submissions to update dog profiles with any missing fields? This will not create duplicates.')) return
    setResyncing(true)
    setResyncResult(null)
    const res = await fetch('/api/tally/sync')
    const data = await res.json()
    const linked: Submission[] = (data.submissions || []).filter((s: Submission) => s.dog_id !== null)
    let updated = 0, failed = 0
    for (const sub of linked) {
      const r = await fetch(`/api/tally/import/${sub.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogId: sub.dog_id, action: 'import' }),
      })
      const d = await r.json()
      if (d.success) updated++
      else failed++
    }
    setResyncResult(`Updated ${updated} dog profile${updated !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}.`)
    setResyncing(false)
  }

  const handleSaveBackup = async () => {
    setSavingBackup(true)
    setSaveBackupResult(null)
    const res = await fetch('/api/backup/save-to-folder', { method: 'POST' })
    const data = await res.json()
    if (data.error) {
      setSaveBackupResult(`Error: ${data.error}`)
    } else {
      setSaveBackupResult(`Saved ${data.files.join(' & ')} to WDC Backups`)
    }
    setSavingBackup(false)
  }

  const handleBackfillBirthdates = async () => {
    setBackfilling(true)
    setBackfillResult(null)
    const res = await fetch('/api/dogs/backfill-birthdates', { method: 'POST' })
    const data = await res.json()
    setBackfillResult(data.error ? `Error: ${data.error}` : `Generated approximate birthdates for ${data.updated} dog(s).`)
    setBackfilling(false)
  }

  const handleCleanup = async () => {
    if (!confirm('Delete all dogs named "Unknown"? This cannot be undone.')) return
    setCleaning(true)
    setCleanResult(null)
    const res = await fetch('/api/tally/cleanup', { method: 'DELETE' })
    const data = await res.json()
    setCleanResult(data.error ? `Error: ${data.error}` : `Deleted ${data.deleted} unknown dog(s).`)
    setCleaning(false)
  }

  const pendingCount = newSubmissions.filter(s => !importResults[s.id]).length

  const handleCalImportPreview = async () => {
    setCalImportPreviewing(true)
    setCalImportPreview(null)
    setCalImportError(null)
    setCalImportResult(null)
    const res = await fetch('/api/bookings/import-calendar')
    const data = await res.json()
    if (data.error) setCalImportError(data.error)
    else setCalImportPreview(data)
    setCalImportPreviewing(false)
  }

  const handleCalImportConfirm = async () => {
    if (!calImportPreview) return
    if (!confirm(`Import ${calImportPreview.ready} bookings from Google Calendar? This cannot be undone.`)) return
    setCalImportImporting(true)
    setCalImportError(null)
    const res = await fetch('/api/bookings/import-calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: true }),
    })
    const data = await res.json()
    if (data.error) setCalImportError(data.error)
    else setCalImportResult(`Imported ${data.imported} bookings. ${data.skipped} duplicates skipped.`)
    setCalImportPreview(null)
    setCalImportImporting(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
      Loading settings…
    </div>
  )

  return (
    <div style={{ maxWidth: 600 }}>
      <PageHead title="Settings" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Export & Backup */}
        <SectionCard title="Export & Backup">
          <SettingRow
            label="Back Up Now"
            hint="Saves all app data to WDC Backups on Google Drive"
            action={
              <SmallBtn onClick={handleSaveBackup} disabled={savingBackup}>
                {savingBackup ? 'Saving…' : 'Back Up'}
              </SmallBtn>
            }
          >
            {saveBackupResult && (
              <p style={{ fontSize: 11, marginTop: 4, color: saveBackupResult.startsWith('Error') ? 'var(--tint-red-text)' : 'var(--tint-green-text)' }}>
                {saveBackupResult}
              </p>
            )}
          </SettingRow>

          <SettingRow
            label="Export Dog Profiles PDF"
            hint="Dog profiles, trials and incidents — opens print view in new tab"
            action={
              <a href="/export" target="_blank" style={{
                display: 'inline-block', background: 'var(--surface-3)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 'var(--density-radius-pill)',
                padding: '7px 14px', fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--font-label)', letterSpacing: '0.06em', textTransform: 'uppercase',
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}>
                Export PDF
              </a>
            }
          />

          <SettingRow
            label="Export Invoices PDF"
            hint="All invoices with service lines, totals and outstanding summary"
            action={
              <a href="/export/invoices" target="_blank" style={{
                display: 'inline-block', background: 'var(--surface-3)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 'var(--density-radius-pill)',
                padding: '7px 14px', fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--font-label)', letterSpacing: '0.06em', textTransform: 'uppercase',
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}>
                Export PDF
              </a>
            }
          />

          <div style={{ borderBottom: 'none' }}>
            <SettingRow
              label="Download Database"
              hint="Downloads a copy of the .db file to your Downloads folder"
              action={
                <a href="/api/backup/db" style={{
                  display: 'inline-block', background: 'var(--surface-3)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 'var(--density-radius-pill)',
                  padding: '7px 14px', fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--font-label)', letterSpacing: '0.06em', textTransform: 'uppercase',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                }}>
                  Download
                </a>
              }
            />
          </div>
        </SectionCard>

        {/* Tally Sync */}
        <SectionCard title="Tally Form Sync">
          {/* API Key */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <FieldLabel>Tally API Key</FieldLabel>
              {hasStoredKey && <Pill color="green">Saved</Pill>}
            </div>
            {!hasStoredKey ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Paste your Tally API key…"
                  style={{ flex: 1 }}
                />
                <SmallBtn onClick={handleSaveKey} disabled={!apiKey.trim()}>Save</SmallBtn>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                API key stored.{' '}
                <button onClick={() => setHasStoredKey(false)} style={{ background: 'none', border: 'none', color: 'var(--cta-purple)', cursor: 'pointer', fontSize: 12, padding: 0 }}>
                  Update
                </button>
              </p>
            )}
            {savedKey && <p style={{ fontSize: 12, color: 'var(--tint-green-text)', marginTop: 4 }}>API key saved!</p>}
          </div>

          {/* Sync button */}
          <SettingRow
            label="Check for New Dogs"
            hint="Shows Tally submissions not yet in the database"
            action={
              <SmallBtn onClick={handleSync} disabled={syncing}>
                {syncing ? 'Checking…' : 'Sync Now'}
              </SmallBtn>
            }
          />

          {syncError && (
            <div style={{ background: 'var(--tint-red)', border: '1px solid var(--tint-red-text)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--tint-red-text)', marginTop: 12 }}>
              {syncError}
            </div>
          )}
          {syncDone && !syncError && (
            <p style={{ fontSize: 12, color: 'var(--tint-green-text)', marginTop: 8, fontWeight: 600 }}>
              {newSubmissions.length === 0 ? 'No new dogs found.' : `${newSubmissions.length} new dog(s) ready to import.`}
            </p>
          )}

          {/* New submissions */}
          {newSubmissions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--font-label)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  New Dogs ({newSubmissions.length})
                </span>
                {pendingCount > 1 && (
                  <SmallBtn onClick={handleImportAll} disabled={importingAll}>
                    {importingAll ? 'Importing…' : `Import All (${pendingCount})`}
                  </SmallBtn>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {newSubmissions.map(sub => {
                  const dogName = parseSubmissionName(sub.raw_data)
                  const date = parseSubmissionDate(sub.raw_data)
                  const result = importResults[sub.id]
                  return (
                    <div key={sub.id} style={{
                      border: `1px solid ${result ? (result.success ? 'var(--tint-green-text)' : 'var(--tint-red-text)') : 'var(--border)'}`,
                      background: result ? (result.success ? 'var(--tint-green)' : 'var(--tint-red)') : 'var(--surface-3)',
                      borderRadius: 10, padding: '10px 12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{dogName}</p>
                        {date && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{date}</p>}
                        {result?.success && <p style={{ fontSize: 11, color: 'var(--tint-green-text)', margin: '2px 0 0', fontWeight: 600 }}>Imported as {result.name}</p>}
                        {result && !result.success && <p style={{ fontSize: 11, color: 'var(--tint-red-text)', margin: '2px 0 0', fontWeight: 600 }}>Import failed</p>}
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {result?.success ? (
                          <Pill color="green">Done</Pill>
                        ) : (
                          <SmallBtn
                            onClick={() => { setImportingId(sub.id); importOne(sub).finally(() => setImportingId(null)) }}
                            disabled={importingId === sub.id || importingAll}
                          >
                            {importingId === sub.id ? '…' : 'Import'}
                          </SmallBtn>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Utilities */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontFamily: 'var(--font-label)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
              Utilities
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <SmallBtn variant="ghost" onClick={handleResync} disabled={resyncing}>
                {resyncing ? 'Re-syncing…' : 'Re-sync existing dogs'}
              </SmallBtn>
              <SmallBtn variant="ghost" onClick={handleBackfillBirthdates} disabled={backfilling}>
                {backfilling ? 'Generating…' : 'Generate birthdates from age'}
              </SmallBtn>
              <SmallBtn variant="danger" onClick={handleCleanup} disabled={cleaning}>
                {cleaning ? 'Deleting…' : 'Delete "Unknown" dogs'}
              </SmallBtn>
              <a href="/api/tally/debug" target="_blank" style={{
                display: 'inline-block', background: 'var(--surface-3)', color: 'var(--text-muted)',
                border: '1px solid var(--border)', borderRadius: 'var(--density-radius-pill)',
                padding: '7px 14px', fontSize: 12, fontFamily: 'var(--font-label)', letterSpacing: '0.06em',
                textTransform: 'uppercase', textDecoration: 'none', fontWeight: 600,
              }}>
                Raw field data
              </a>
            </div>
            {resyncResult && <p style={{ fontSize: 12, marginTop: 8, fontWeight: 600, color: 'var(--tint-blue-text)' }}>{resyncResult}</p>}
            {cleanResult && <p style={{ fontSize: 12, marginTop: 8, fontWeight: 600, color: cleanResult.startsWith('Error') ? 'var(--tint-red-text)' : 'var(--tint-green-text)' }}>{cleanResult}</p>}
            {backfillResult && <p style={{ fontSize: 12, marginTop: 8, fontWeight: 600, color: backfillResult.startsWith('Error') ? 'var(--tint-red-text)' : 'var(--tint-green-text)' }}>{backfillResult}</p>}
          </div>
        </SectionCard>

        {/* Google Calendar */}
        <SectionCard
          title="Google Calendar"
          badge={calConnected ? <Pill color="green">Connected</Pill> : undefined}
        >
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Authorise the app to create and update events in your Google Calendar when bookings are made.
          </p>
          <a href="/api/calendar/auth" style={{
            display: 'inline-block', background: 'var(--cta-purple)', color: '#fff',
            borderRadius: 'var(--density-radius-pill)', padding: '8px 18px',
            fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-label)',
            letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none',
          }}>
            {calConnected ? 'Re-authorise Google Calendar' : 'Connect Google Calendar'}
          </a>
          {calConnected && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              Connected. Re-authorise at any time if it stops working.
            </p>
          )}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Public Availability Calendar ID</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
              A separate Google Calendar for public availability. The app will write anonymised daily events showing spaces remaining.
              Find the Calendar ID in Google Calendar → Settings → your calendar → Calendar ID.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={publicCalId}
                onChange={e => setPublicCalId(e.target.value)}
                placeholder="xxxxxxxxxx@group.calendar.google.com"
                style={{ flex: 1 }}
              />
              <SmallBtn onClick={handleSavePublicCal} disabled={savingPublicCal}>
                {savingPublicCal ? 'Saving…' : 'Save'}
              </SmallBtn>
            </div>
            {savedPublicCal && <p style={{ fontSize: 12, color: 'var(--tint-green-text)', marginTop: 4 }}>Saved!</p>}
          </div>

          {publicCalId && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Sync Public Calendar</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Recalculates and rewrites all events for the next 180 days</p>
                {syncPublicCalResult && (
                  <p style={{ fontSize: 11, marginTop: 4, fontWeight: 600, color: syncPublicCalResult.startsWith('Error') ? 'var(--tint-red-text)' : 'var(--tint-green-text)' }}>
                    {syncPublicCalResult}
                  </p>
                )}
              </div>
              <SmallBtn variant="ghost" onClick={handleSyncPublicCal} disabled={syncingPublicCal}>
                {syncingPublicCal ? 'Syncing…' : 'Sync Now'}
              </SmallBtn>
            </div>
          )}
        </SectionCard>

        {/* App Password */}
        <SectionCard title="App Password">
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            Change the password used to log in to this app.
          </p>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              type={showAppPassword ? 'text' : 'password'}
              value={newAppPassword}
              onChange={e => setNewAppPassword(e.target.value)}
              placeholder="New password"
              style={{ width: '100%', paddingRight: 56, boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowAppPassword(p => !p)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-label)' }}
            >
              {showAppPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SmallBtn onClick={handleSaveAppPassword} disabled={savingAppPassword || !newAppPassword.trim()}>
              {savingAppPassword ? 'Saving…' : 'Update Password'}
            </SmallBtn>
            {savedAppPassword && <span style={{ fontSize: 12, color: 'var(--tint-green-text)', fontWeight: 600 }}>Password updated!</span>}
          </div>
        </SectionCard>

        {/* Business Details */}
        <SectionCard title="Business Details">
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            These appear on your printed invoices.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <FieldLabel>Business Name</FieldLabel>
              <input type="text" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                placeholder="Whitstable Dog Care" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>

            <div>
              <FieldLabel>Address</FieldLabel>
              <textarea value={form.businessAddress} onChange={e => setForm(f => ({ ...f, businessAddress: e.target.value }))}
                rows={3} placeholder={'123 Harbour Street\nWhitstable\nKent CT5 1AA'}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>

            <div>
              <FieldLabel>Email</FieldLabel>
              <input type="email" value={form.businessEmail} onChange={e => setForm(f => ({ ...f, businessEmail: e.target.value }))}
                placeholder="jack@whitstabledogcare.co.uk" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>

            <div>
              <FieldLabel>Phone</FieldLabel>
              <input type="tel" value={form.businessPhone} onChange={e => setForm(f => ({ ...f, businessPhone: e.target.value }))}
                placeholder="07700 000000" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>

            <div>
              <FieldLabel>Payment / Bank Details</FieldLabel>
              <textarea value={form.paymentInfo} onChange={e => setForm(f => ({ ...f, paymentInfo: e.target.value }))}
                rows={4} placeholder={'Bank: Lloyds\nAccount name: Whitstable Dog Care\nSort code: 00-00-00\nAccount number: 00000000'}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>

            <div>
              <FieldLabel>Gmail App Password</FieldLabel>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                Required to send invoices by email. Go to Google Account → Security → 2-Step Verification → App passwords.
              </p>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.gmailAppPassword}
                  onChange={e => setForm(f => ({ ...f, gmailAppPassword: e.target.value }))}
                  placeholder="xxxx xxxx xxxx xxxx"
                  style={{ width: '100%', paddingRight: 56, boxSizing: 'border-box' }}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-label)' }}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <SmallBtn onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Settings'}
            </SmallBtn>
            {saved && <span style={{ fontSize: 12, color: 'var(--tint-green-text)', fontWeight: 600 }}>Saved!</span>}
          </div>
        </SectionCard>

        {/* One-time tools */}
        <div style={{
          border: '1px dashed var(--border)',
          borderRadius: 'var(--density-radius-card)',
          padding: 16,
        }}>
          <button
            onClick={() => setShowCalImport(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-label)', letterSpacing: '0.08em', textTransform: 'uppercase', width: '100%', textAlign: 'left' }}
          >
            {showCalImport ? '▲ Hide' : '▼ Show'} one-time tools
          </button>

          {showCalImport && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  Import Google Calendar Events as Bookings
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  One-time tool to import past bookings from Google Calendar into the bookings database.
                  Recurring events will only import past occurrences. Duplicates are automatically skipped.
                </p>
              </div>

              {!calImportResult && (
                <SmallBtn variant="ghost" onClick={handleCalImportPreview} disabled={calImportPreviewing}>
                  {calImportPreviewing ? 'Scanning calendar…' : 'Preview import'}
                </SmallBtn>
              )}

              {calImportPreview && (
                <div style={{
                  background: 'var(--surface-3)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '12px 14px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--tint-green-text)', margin: 0 }}>
                    {calImportPreview.ready} ready to import
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    {calImportPreview.duplicate} already in bookings (will be skipped)
                  </p>
                  {calImportPreview.unmatched > 0 && (
                    <div>
                      <p style={{ fontSize: 12, color: 'var(--tint-red-text)', margin: 0 }}>
                        {calImportPreview.unmatched} events with unrecognised dog names (will be skipped):
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--tint-red-text)', opacity: 0.8, margin: '2px 0 0' }}>
                        {calImportPreview.unmatchedNames.join(', ')}
                      </p>
                    </div>
                  )}
                  <div style={{ marginTop: 4 }}>
                    <SmallBtn
                      onClick={handleCalImportConfirm}
                      disabled={calImportImporting || calImportPreview.ready === 0}
                    >
                      {calImportImporting ? 'Importing…' : `Import ${calImportPreview.ready} bookings`}
                    </SmallBtn>
                  </div>
                </div>
              )}

              {calImportError && <p style={{ fontSize: 12, color: 'var(--tint-red-text)' }}>{calImportError}</p>}
              {calImportResult && <p style={{ fontSize: 12, color: 'var(--tint-green-text)', fontWeight: 600 }}>{calImportResult}</p>}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
