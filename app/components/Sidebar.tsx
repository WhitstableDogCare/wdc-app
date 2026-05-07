'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Inline SVG icons — 18x18, stroke currentColor, strokeWidth 1.75
function IconDog() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2 .336-3.5 2.098-3.5 4 0 .801.07 1.6.14 2.4C3 11.5 3 13 3 13.5c0 2.5 2 4.5 4.5 4.5S12 16 12 13.5c0-.5.14-1.94.14-1.94"/>
      <path d="M14.836 5C14.836 3.67 16.165 2.62 17.836 3c1.78.397 2.996 2.098 2.996 4 0 .758-.07 1.486-.14 2.2l.144.3"/>
      <circle cx="17" cy="15" r="2.5"/>
      <path d="M14.5 13.5v-2"/>
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  )
}
function IconBooking() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}
function IconInvoice() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  )
}
function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}
function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
function IconSync() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  )
}
function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}
function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { href: '/',          label: 'Dogs',      icon: IconDog },
  { href: '/bookings',  label: 'Bookings',  icon: IconBooking },
  { href: '/calendar',  label: 'Calendar',  icon: IconCalendar },
  { href: '/invoices',  label: 'Invoices',  icon: IconInvoice },
]
const TOOLS_ITEMS = [
  { href: '/sync',     label: 'Sync',     icon: IconSync },
  { href: '/settings', label: 'Settings', icon: IconSettings },
]

function ThemeButton() {
  const [dark, setDark] = React.useState(false)
  React.useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])
  function toggle() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }
  return (
    <button
      onClick={toggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 10, border: 'none',
        background: 'transparent', color: 'inherit', cursor: 'pointer',
        width: '100%', fontFamily: 'var(--font-label)', textTransform: 'uppercase',
        letterSpacing: '0.08em', fontSize: 13, fontWeight: 500, opacity: 0.8,
      }}
    >
      {dark ? <IconSun /> : <IconMoon />}
      {dark ? 'Light Mode' : 'Dark Mode'}
    </button>
  )
}

export default function Sidebar({ drawerOpen, onClose }: { drawerOpen: boolean; onClose: () => void }) {
  const pathname = usePathname()

  const railStyle: React.CSSProperties = {
    background: 'var(--surface-rail)',
    color: 'var(--surface-rail-text)',
    padding: '18px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    borderRight: '1px solid var(--border)',
    height: '100vh',
    overflowY: 'auto',
    overflowX: 'hidden',
    position: 'sticky',
    top: 0,
  }

  return (
    <>
      <style>{`
        @media (max-width: 900px) {
          .wdc-rail {
            position: fixed !important;
            left: 0; top: 0;
            width: 260px;
            z-index: 60;
            transform: translateX(-100%);
            transition: transform 220ms ease;
            box-shadow: var(--sh-lg);
          }
          .wdc-rail.open { transform: translateX(0) !important; }
        }
      `}</style>
      <nav className={`wdc-rail${drawerOpen ? ' open' : ''}`} style={railStyle}>
        {/* Brand block */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 14px', borderBottom: '1px dashed rgba(0,0,0,0.12)' }}>
          <img src="/logo.webp" alt="WDC" width={38} height={38} style={{ borderRadius: '50%', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, lineHeight: 1.1, fontWeight: 700, color: 'var(--charcoal)' }}>
              Whitstable<br/>Dog Care
            </div>
            <div style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 9.5, color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>
              Care Manager
            </div>
          </div>
        </div>

        {/* Main nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname?.startsWith(href)
            return (
              <Link key={href} href={href} onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 10,
                  fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.08em',
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--charcoal)' : 'inherit',
                  background: isActive ? 'var(--rail-active)' : 'transparent',
                  boxShadow: isActive ? 'var(--sh-sm)' : 'none',
                  transition: 'background 150ms ease, color 150ms ease',
                  border: 'none', cursor: 'pointer',
                }}>
                <Icon />
                {label}
              </Link>
            )
          })}
        </div>

        {/* Tools section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 10, color: 'rgba(0,0,0,0.5)', padding: '0 10px', margin: '8px 0 4px', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            Tools
          </div>
          {TOOLS_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname?.startsWith(href)
            return (
              <Link key={href} href={href} onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 10,
                  fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.08em',
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--charcoal)' : 'inherit',
                  background: isActive ? 'var(--rail-active)' : 'transparent',
                  boxShadow: isActive ? 'var(--sh-sm)' : 'none',
                  transition: 'background 150ms ease',
                  border: 'none', cursor: 'pointer',
                }}>
                <Icon />
                {label}
              </Link>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px dashed rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ThemeButton />
        </div>
      </nav>
    </>
  )
}
