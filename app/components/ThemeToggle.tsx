'use client'

import { useEffect, useState } from 'react'

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    // On mount, sync button state with what the inline script already applied
    const stored = localStorage.getItem('theme')
    const isDark = stored === 'dark' || (stored === null && mediaQuery.matches)
    setDark(isDark)
    applyTheme(isDark)

    // React to system theme changes in real time — only if the user hasn't
    // set a manual preference (i.e. localStorage key is absent)
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setDark(e.matches)
        applyTheme(e.matches)
      }
    }

    mediaQuery.addEventListener('change', handleSystemChange)
    return () => mediaQuery.removeEventListener('change', handleSystemChange)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    applyTheme(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-base hover:bg-gray-100 transition-colors"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
