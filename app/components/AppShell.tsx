'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setDrawerOpen(false) }, [pathname])

  if (pathname?.startsWith('/login')) {
    return <>{children}</>
  }

  return (
    <>
      <div
        style={{ display: drawerOpen ? 'block' : 'none', position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)' }}
        onClick={() => setDrawerOpen(false)}
      />
      <div
        style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}
        data-app-shell
      >
        <Sidebar drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Topbar onMenuClick={() => setDrawerOpen(true)} />
          <main style={{ padding: '24px 28px 56px', width: '100%' }}>
            {children}
          </main>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          [data-app-shell] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
