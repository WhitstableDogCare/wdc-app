import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import ThemeToggle from './components/ThemeToggle'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Whitstable Dog Care',
  description: 'Dog profiles and management for Whitstable Dog Care',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Runs before React hydrates to prevent dark mode flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem('theme');var p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(s===null&&p)){document.documentElement.classList.add('dark');}})();`,
          }}
        />
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src="/wdc-logo.png" alt="Whitstable Dog Care" width={56} height={56} className="rounded-full" />
              <span className="font-bold text-lg tracking-tight text-[#2d2d4e]">Whitstable Dog Care</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium text-[#2d6a4f]">
              <Link href="/" className="hover:text-[#245a41] transition-colors">Dogs</Link>
              <Link href="/bookings" className="hover:text-[#245a41] transition-colors">Bookings & Invoices</Link>
              <Link href="/calendar" className="hover:text-[#245a41] transition-colors">Calendar</Link>
              <Link href="/dashboard" className="hover:text-[#245a41] transition-colors">Dashboard</Link>
              <Link href="/settings" className="hover:text-[#245a41] transition-colors">Settings</Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
