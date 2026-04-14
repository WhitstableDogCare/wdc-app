'use client'

import { useState, useEffect } from 'react'

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

export default function SettingsPage() {
  // Business details
  const [form, setForm] = useState<Config>({
    businessName: '', businessAddress: '', businessEmail: '',
    businessPhone: '', paymentInfo: '', gmailAppPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
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

  const handleSyncPublicCal = async () => {
    setSyncingPublicCal(true)
    setSyncPublicCalResult(null)
    const res = await fetch('/api/public-calendar/sync', { method: 'POST' })
    const data = await res.json()
    setSyncingPublicCal(false)
    if (data.error) setSyncPublicCalResult(`Error: ${data.error}`)
    else setSyncPublicCalResult(`✓ Synced ${data.startDate} to ${data.endDate}`)
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
      setSaveBackupResult(`✓ Saved ${data.files.join(' & ')} to WDC Backups`)
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
    else setCalImportResult(`✓ Imported ${data.imported} bookings. ${data.skipped} duplicates skipped.`)
    setCalImportPreview(null)
    setCalImportImporting(false)
  }

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Export & Backup */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-3">Export & Backup</h2>

        {/* Back Up Now */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-gray-800">💾 Back Up Now</p>
            <p className="text-xs text-gray-500 mt-0.5">Saves all app data to <span className="font-medium text-gray-600">WDC Backups</span> on Google Drive</p>
            {saveBackupResult && (
              <p className={`text-xs mt-1 font-medium ${saveBackupResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {saveBackupResult}
              </p>
            )}
          </div>
          <button onClick={handleSaveBackup} disabled={savingBackup}
            className="flex-shrink-0 text-sm bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-60 font-medium">
            {savingBackup ? 'Saving...' : 'Back Up Now'}
          </button>
        </div>

        <div className="border-t border-gray-100" />

        {/* Export Dog Profiles PDF */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-gray-800">📄 Export Dog Profiles PDF</p>
            <p className="text-xs text-gray-500 mt-0.5">Dog profiles, trials &amp; incidents — opens print view in new tab</p>
          </div>
          <a href="/export" target="_blank"
            className="flex-shrink-0 text-sm bg-[#2d6a4f] text-white px-4 py-2 rounded-lg hover:bg-[#245a41] transition-colors font-medium">
            Export PDF
          </a>
        </div>

        <div className="border-t border-gray-100" />

        {/* Export Invoices PDF */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-gray-800">🧾 Export Invoices PDF</p>
            <p className="text-xs text-gray-500 mt-0.5">All invoices with service lines, totals &amp; outstanding summary</p>
          </div>
          <a href="/export/invoices" target="_blank"
            className="flex-shrink-0 text-sm bg-[#2d6a4f] text-white px-4 py-2 rounded-lg hover:bg-[#245a41] transition-colors font-medium">
            Export PDF
          </a>
        </div>

        <div className="border-t border-gray-100" />

        {/* Download .db */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-gray-800">⬇️ Download .db</p>
            <p className="text-xs text-gray-500 mt-0.5">Downloads a copy of the database file to your Downloads folder</p>
          </div>
          <a href="/api/backup/db"
            className="flex-shrink-0 text-sm bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium">
            Download
          </a>
        </div>
      </div>

      {/* Tally Sync */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-3">Tally Form Sync</h2>

        {/* API Key */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tally API Key</label>
            {hasStoredKey && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">✓ Saved</span>}
          </div>
          {!hasStoredKey ? (
            <div className="flex gap-2">
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder="Paste your Tally API key..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
              <button onClick={handleSaveKey}
                className="bg-[#2d6a4f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#245a41] transition-colors">
                Save
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              API key stored locally.{' '}
              <button onClick={() => setHasStoredKey(false)} className="text-[#2d6a4f] underline">Update</button>
            </p>
          )}
          {savedKey && <p className="text-green-600 text-sm mt-1">API key saved!</p>}
        </div>

        {/* Sync button */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Check for New Dogs</p>
            <p className="text-xs text-gray-500 mt-0.5">Shows Tally submissions not yet in the database</p>
          </div>
          <button onClick={handleSync} disabled={syncing}
            className="bg-[#2d6a4f] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#245a41] transition-colors disabled:opacity-60">
            {syncing ? 'Checking...' : 'Sync Now'}
          </button>
        </div>

        {syncError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{syncError}</div>}
        {syncDone && !syncError && (
          <p className="text-sm text-[#2d6a4f] font-medium">
            {newSubmissions.length === 0 ? 'No new dogs found.' : `${newSubmissions.length} new dog(s) ready to import.`}
          </p>
        )}

        {/* New submissions */}
        {newSubmissions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">New Dogs ({newSubmissions.length})</p>
              {pendingCount > 1 && (
                <button onClick={handleImportAll} disabled={importingAll}
                  className="bg-[#2d6a4f] text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#245a41] transition-colors disabled:opacity-60">
                  {importingAll ? 'Importing...' : `Import All (${pendingCount})`}
                </button>
              )}
            </div>
            {newSubmissions.map(sub => {
              const dogName = parseSubmissionName(sub.raw_data)
              const date = parseSubmissionDate(sub.raw_data)
              const result = importResults[sub.id]
              return (
                <div key={sub.id} className={`border rounded-xl p-4 ${result ? (result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50') : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-800">{dogName}</p>
                      {date && <p className="text-xs text-gray-500 mt-0.5">{date}</p>}
                      {result?.success && <p className="text-xs text-green-700 font-medium mt-0.5">Imported as {result.name}</p>}
                      {result && !result.success && <p className="text-xs text-red-600 font-medium mt-0.5">Import failed</p>}
                    </div>
                    <div className="flex-shrink-0">
                      {result?.success ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Done</span>
                      ) : (
                        <button onClick={() => { setImportingId(sub.id); importOne(sub).finally(() => setImportingId(null)) }}
                          disabled={importingId === sub.id || importingAll}
                          className="text-sm bg-[#2d6a4f] text-white px-3 py-1.5 rounded-lg hover:bg-[#245a41] transition-colors disabled:opacity-60 font-medium">
                          {importingId === sub.id ? '...' : 'Import'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Utilities */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Utilities</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleResync} disabled={resyncing}
              className="text-sm bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-60">
              {resyncing ? 'Re-syncing...' : 'Re-sync existing dogs'}
            </button>
            <button onClick={handleBackfillBirthdates} disabled={backfilling}
              className="text-sm bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-60">
              {backfilling ? 'Generating...' : 'Generate birthdates from age'}
            </button>
            <button onClick={handleCleanup} disabled={cleaning}
              className="text-sm bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-60">
              {cleaning ? 'Deleting...' : 'Delete all "Unknown" dogs'}
            </button>
            <a href="/api/tally/debug" target="_blank"
              className="text-sm bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              View raw field data ↗
            </a>
          </div>
          {resyncResult && <p className="text-sm mt-2 font-medium text-blue-700">{resyncResult}</p>}
          {cleanResult && <p className={`text-sm mt-2 font-medium ${cleanResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{cleanResult}</p>}
          {backfillResult && <p className={`text-sm mt-2 font-medium ${backfillResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{backfillResult}</p>}
        </div>
      </div>

      {/* Google Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h2 className="font-semibold text-gray-800">Google Calendar</h2>
          {calConnected && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">✓ Connected</span>}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Authorise the app to create and update events in your Google Calendar when bookings are made.
        </p>
        <a href="/api/calendar/auth"
          className="inline-block bg-[#2d6a4f] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#245a41] transition-colors">
          {calConnected ? 'Re-authorise Google Calendar' : 'Connect Google Calendar'}
        </a>
        {calConnected && <p className="text-xs text-gray-400 mt-2">Connected. You can re-authorise at any time if it stops working.</p>}

        <div className="border-t border-gray-100 mt-5 pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">Public Availability Calendar ID</p>
          <p className="text-xs text-gray-500 mb-3">
            A separate Google Calendar for public availability. The app will write anonymised daily events
            showing spaces remaining. Find the Calendar ID in Google Calendar → Settings → your calendar → Calendar ID.
          </p>
          <div className="flex gap-2">
            <input type="text" value={publicCalId} onChange={e => setPublicCalId(e.target.value)}
              placeholder="xxxxxxxxxx@group.calendar.google.com"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
            <button onClick={handleSavePublicCal} disabled={savingPublicCal}
              className="flex-shrink-0 bg-[#2d6a4f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#245a41] transition-colors disabled:opacity-60">
              {savingPublicCal ? 'Saving...' : 'Save'}
            </button>
          </div>
          {savedPublicCal && <p className="text-green-600 text-sm mt-1">Saved!</p>}
        </div>

        {publicCalId && (
          <div className="border-t border-gray-100 mt-4 pt-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">Sync Public Calendar</p>
              <p className="text-xs text-gray-500 mt-0.5">Recalculates and rewrites all events for the next 180 days</p>
              {syncPublicCalResult && (
                <p className={`text-xs mt-1 font-medium ${syncPublicCalResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {syncPublicCalResult}
                </p>
              )}
            </div>
            <button onClick={handleSyncPublicCal} disabled={syncingPublicCal}
              className="flex-shrink-0 text-sm bg-gray-100 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-60">
              {syncingPublicCal ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        )}
      </div>

      {/* Business Details */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-3">Business Details</h2>
          <p className="text-xs text-gray-500 mt-2">These appear on your printed invoices.</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Business Name</label>
          <input type="text" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
            placeholder="Whitstable Dog Care"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Address</label>
          <textarea value={form.businessAddress} onChange={e => setForm(f => ({ ...f, businessAddress: e.target.value }))}
            rows={3} placeholder={"123 Harbour Street\nWhitstable\nKent CT5 1AA"}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Email</label>
          <input type="email" value={form.businessEmail} onChange={e => setForm(f => ({ ...f, businessEmail: e.target.value }))}
            placeholder="jack@whitstabledogcare.co.uk"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Phone</label>
          <input type="tel" value={form.businessPhone} onChange={e => setForm(f => ({ ...f, businessPhone: e.target.value }))}
            placeholder="07700 000000"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Payment / Bank Details</label>
          <textarea value={form.paymentInfo} onChange={e => setForm(f => ({ ...f, paymentInfo: e.target.value }))}
            rows={4} placeholder={"Bank: Lloyds\nAccount name: Whitstable Dog Care\nSort code: 00-00-00\nAccount number: 00000000"}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Gmail App Password</label>
          <p className="text-xs text-gray-400 mb-2">
            Required to send invoices by email. Go to Google Account → Security → 2-Step Verification → App passwords.
          </p>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={form.gmailAppPassword}
              onChange={e => setForm(f => ({ ...f, gmailAppPassword: e.target.value }))}
              placeholder="xxxx xxxx xxxx xxxx"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] pr-16" />
            <button type="button" onClick={() => setShowPassword(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="bg-[#2d6a4f] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#245a41] transition-colors disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="text-green-600 text-sm">Saved!</span>}
        </div>
      </div>

      {/* One-time Calendar Import — hidden behind toggle */}
      <div className="border border-dashed border-gray-200 rounded-2xl p-4">
        <button onClick={() => setShowCalImport(v => !v)}
          className="text-xs text-gray-400 hover:text-gray-600 w-full text-left">
          {showCalImport ? '▲ Hide' : '▼ Show'} one-time tools
        </button>

        {showCalImport && (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">Import Google Calendar Events as Bookings</p>
              <p className="text-xs text-gray-500 mt-1">
                One-time tool to import past bookings from Google Calendar into the bookings database.
                Recurring events (e.g. Beau&apos;s weekly daycare) will only import past occurrences.
                Duplicates are automatically skipped.
              </p>
            </div>

            {!calImportResult && (
              <button onClick={handleCalImportPreview} disabled={calImportPreviewing}
                className="text-sm bg-gray-100 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-60">
                {calImportPreviewing ? 'Scanning calendar...' : 'Preview import'}
              </button>
            )}

            {calImportPreview && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-green-700">✅ {calImportPreview.ready} ready to import</span>
                </p>
                <p className="text-sm text-gray-500">⏭ {calImportPreview.duplicate} already in bookings (will be skipped)</p>
                {calImportPreview.unmatched > 0 && (
                  <div>
                    <p className="text-sm text-red-600">❌ {calImportPreview.unmatched} events with unrecognised dog names (will be skipped):</p>
                    <p className="text-xs text-red-400 mt-1">{calImportPreview.unmatchedNames.join(', ')}</p>
                  </div>
                )}
                <button onClick={handleCalImportConfirm} disabled={calImportImporting || calImportPreview.ready === 0}
                  className="mt-2 text-sm bg-[#2d6a4f] text-white px-4 py-2 rounded-lg hover:bg-[#245a41] transition-colors disabled:opacity-60 font-medium">
                  {calImportImporting ? 'Importing...' : `Import ${calImportPreview.ready} bookings`}
                </button>
              </div>
            )}

            {calImportError && <p className="text-sm text-red-600">{calImportError}</p>}
            {calImportResult && <p className="text-sm text-green-700 font-medium">{calImportResult}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
