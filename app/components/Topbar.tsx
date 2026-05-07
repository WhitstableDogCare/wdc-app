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
    <div className="topbar-wrap" style={{
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

      {/* Desktop breadcrumb */}
      <div
        style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 11, color: 'var(--text-muted)' }}
        className="topbar-crumbs"
      >
        WDC / <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{crumb}</strong>
      </div>

      {/* Mobile page title — centred, absolute so it doesn't push siblings */}
      <div className="topbar-mobile-title" style={{
        position: 'absolute', left: 0, right: 0, textAlign: 'center',
        fontFamily: 'var(--font-label)', textTransform: 'uppercase',
        letterSpacing: '0.12em', fontSize: 12, fontWeight: 600,
        color: 'var(--text)', pointerEvents: 'none',
        display: 'none',
      }}>
        {crumb}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .topbar-wrap { padding: 0 12px !important; }
          .menu-btn { display: inline-flex !important; align-items: center; }
          .topbar-crumbs { display: none !important; }
          .topbar-mobile-title { display: block !important; }
        }
      `}</style>
    </div>
  )
}
