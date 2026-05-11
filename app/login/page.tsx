import { login } from './actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <img src="/botanical-leaf.png" alt="" aria-hidden="true"
        style={{ position: 'absolute', bottom: -20, left: -20, width: 200, opacity: 0.18, pointerEvents: 'none' }} />
      <img src="/botanical-flower.png" alt="" aria-hidden="true"
        style={{ position: 'absolute', top: -20, right: -20, width: 200, opacity: 0.18, pointerEvents: 'none' }} />

      <div style={{
        background: 'var(--surface-2)',
        borderRadius: 20,
        boxShadow: 'var(--sh-lg)',
        padding: '36px 32px',
        width: '100%',
        maxWidth: 360,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
        position: 'relative',
        zIndex: 1,
      }}>
        <img src="/logo.webp" alt="Whitstable Dog Care" style={{ width: 72, height: 72, borderRadius: '50%', marginBottom: 14, border: '3px solid var(--gold)' }} />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--text)', margin: '0 0 4px', textAlign: 'center' }}>
          Whitstable Dog Care
        </h1>
        <p style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 10, color: 'var(--text-muted)', margin: '0 0 28px' }}>
          Care Manager
        </p>

        <form action={login} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          <input
            type="password"
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            autoFocus
            style={{ width: '100%' }}
          />
          {error && <p style={{ fontSize: 12, color: 'var(--tint-red-text)', textAlign: 'center' }}>Incorrect password</p>}
          <button
            type="submit"
            style={{
              background: 'var(--cta-purple)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--density-radius-pill)',
              padding: '10px 24px',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-label)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              boxShadow: 'var(--sh-cta)',
              width: '100%',
              transition: 'opacity 150ms',
            }}
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
