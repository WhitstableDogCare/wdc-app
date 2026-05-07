'use client'
import { usePathname } from 'next/navigation'

function IconMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

const CRUMBS: Record<string, string> = {
  '/': 'Dogs',
  '/dashboard': 'Dashboard',
  '/bookings': 'Bookings',
  '/calendar': 'Calendar',
  '/invoices': 'Invoices',
  '/settings': 'Settings',
  '/sync': 'Sync',
  '/incidents': 'Incidents',
  '/export': 'Export',
}

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname() ?? '/'
  const segment = '/' + (pathname.split('/')[1] ?? '')
  const crumb = CRUMBS[segment] ?? segment.replace('/', '')

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '0 28px', height: 56, minHeight: 56,
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface-2)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="menu-btn"
        style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', color: 'var(--text)', cursor: 'pointer', display: 'none' }}
      >
        <IconMenu />
      </button>

      {/* Breadcrumb */}
      <div
        style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 11, color: 'var(--text-muted)' }}
        className="topbar-crumbs"
      >
        WDC / <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{crumb}</strong>
      </div>

      <div style={{ flex: 1 }} />

      {/* Search (desktop) */}
      <div style={{ position: 'relative', maxWidth: 280, width: '100%' }} className="topbar-search">
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
          <IconSearch />
        </span>
        <input
          type="search"
          placeholder="Search…"
          style={{ width: '100%', padding: '7px 12px 7px 32px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-app)', fontFamily: 'var(--font-body)', color: 'var(--text)', fontSize: 13 }}
        />
      </div>

      <style>{`
        @media (max-width: 900px) {
          .menu-btn { display: inline-flex !important; align-items: center; }
          .topbar-crumbs { display: none; }
          .topbar-search { max-width: none; }
        }
      `}</style>
    </div>
  )
}
