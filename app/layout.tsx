import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import AppShell from './components/AppShell'

const merienda = localFont({
  src: [
    { path: './fonts/Merienda-Regular.ttf', weight: '400' },
    { path: './fonts/Merienda-Bold.ttf',    weight: '700' },
  ],
  variable: '--font-merienda',
})
const oswald = localFont({
  src: [
    { path: './fonts/Oswald-Regular.ttf', weight: '400' },
    { path: './fonts/Oswald-Medium.ttf',  weight: '500' },
  ],
  variable: '--font-oswald',
})
const openSans = localFont({
  src: [
    { path: './fonts/OpenSans-Regular.ttf',  weight: '400' },
    { path: './fonts/OpenSans-SemiBold.ttf', weight: '600' },
  ],
  variable: '--font-open-sans',
})

export const metadata: Metadata = {
  title: 'Whitstable Dog Care',
  description: 'Dog profiles and management for Whitstable Dog Care',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'WDC' },
  themeColor: '#ECBB56',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning
      className={`${merienda.variable} ${oswald.variable} ${openSans.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/logo.webp" />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){var s=localStorage.getItem('theme');var p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(s===null&&p)){document.documentElement.classList.add('dark');}})();`,
        }} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
