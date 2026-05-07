import React from 'react'
import Link from 'next/link'

// Button
type BtnVariant = 'primary' | 'secondary' | 'ghost'
type BtnSize    = 'default' | 'sm'

export function Btn({ children, variant = 'primary', size = 'default', href, onClick, type = 'button', className = '', disabled, ...rest }: {
  children: React.ReactNode
  variant?: BtnVariant
  size?: BtnSize
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
  disabled?: boolean
  [key: string]: unknown
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    borderRadius: 'var(--density-radius-pill)',
    fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.06em',
    fontSize: size === 'sm' ? 11.5 : 12.5, fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1px solid transparent',
    transition: 'all 150ms ease',
    whiteSpace: 'nowrap',
    padding: size === 'sm' ? '5px 10px' : '8px 14px',
    opacity: disabled ? 0.6 : 1,
  }
  const variantStyles: Record<BtnVariant, React.CSSProperties> = {
    primary:   { background: 'var(--cta-purple)', color: '#fff', boxShadow: 'var(--sh-cta)' },
    secondary: { background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' },
    ghost:     { background: 'transparent', color: 'var(--text)' },
  }
  const style = { ...base, ...variantStyles[variant] }
  if (href) return <Link href={href} style={style} className={className}>{children}</Link>
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`wdc-btn-${variant} ${className}`}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  )
}

// Card
export function Card({ children, className = '', style, flat }: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  flat?: boolean
}) {
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--density-radius-card)',
        padding: 'var(--density-pad)',
        boxShadow: flat ? 'none' : 'var(--sh-sm)',
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  )
}

// Pill badge
type PillColor = 'green' | 'purple' | 'gold' | 'red' | 'blue' | 'amber' | 'neutral'

export function Pill({ children, color = 'neutral', dot }: { children: React.ReactNode; color?: PillColor; dot?: boolean }) {
  const colorVars: Record<PillColor, { bg: string; text: string }> = {
    neutral: { bg: 'var(--tint-neutral)', text: 'var(--tint-neutral-text)' },
    purple:  { bg: 'var(--tint-purple)',  text: 'var(--tint-purple-text)'  },
    gold:    { bg: 'var(--tint-gold)',    text: 'var(--tint-gold-text)'    },
    green:   { bg: 'var(--tint-green)',   text: 'var(--tint-green-text)'   },
    red:     { bg: 'var(--tint-red)',     text: 'var(--tint-red-text)'     },
    blue:    { bg: 'var(--tint-blue)',    text: 'var(--tint-blue-text)'    },
    amber:   { bg: 'var(--tint-amber)',   text: 'var(--tint-amber-text)'   },
  }
  const { bg, text } = colorVars[color]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 50, fontFamily: 'var(--font-label)', fontSize: 11, letterSpacing: '0.04em', fontWeight: 500, background: bg, color: text, whiteSpace: 'nowrap' }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />}
      {children}
    </span>
  )
}

// Stat tile
type StatTint = 'purple' | 'gold' | 'green' | 'red' | 'blue' | 'amber' | 'neutral' | 'none'

export function StatTile({ value, label, sub, tint = 'none', href }: { value: string | number; label: string; sub?: string; tint?: StatTint; href?: string }) {
  const tintVars: Record<StatTint, { bg: string; text: string }> = {
    none:    { bg: 'var(--surface-2)',    text: 'var(--text)'              },
    neutral: { bg: 'var(--tint-neutral)', text: 'var(--tint-neutral-text)' },
    purple:  { bg: 'var(--tint-purple)',  text: 'var(--tint-purple-text)'  },
    gold:    { bg: 'var(--tint-gold)',    text: 'var(--tint-gold-text)'    },
    green:   { bg: 'var(--tint-green)',   text: 'var(--tint-green-text)'   },
    red:     { bg: 'var(--tint-red)',     text: 'var(--tint-red-text)'     },
    blue:    { bg: 'var(--tint-blue)',    text: 'var(--tint-blue-text)'    },
    amber:   { bg: 'var(--tint-amber)',   text: 'var(--tint-amber-text)'   },
  }
  const { bg, text } = tintVars[tint]
  const inner = (
    <div style={{ background: bg, border: tint === 'none' ? '1px solid var(--border)' : 'none', borderRadius: 12, padding: '14px 16px', color: text, boxShadow: tint === 'none' ? 'var(--sh-sm)' : 'none' }}>
      <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10.5, marginTop: 6, fontWeight: 500, opacity: 0.85 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>{sub}</div>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

// Page head
export function PageHead({ title, eyebrow, sub, children }: { title: string; eyebrow?: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
      <div className="page-head-text">
        {eyebrow && (
          <span style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            {eyebrow}
          </span>
        )}
        <h1 className="page-title" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,30px)', margin: 0, fontWeight: 400, color: 'var(--text)', lineHeight: 1.15 }}>
          {title}
        </h1>
        {sub && <p style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 14 }}>{sub}</p>}
      </div>
      {children && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// Field grid for detail views
export function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
      {children}
    </div>
  )
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 12px', background: 'var(--surface-app)', borderRadius: 8 }}>
      <span style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--text)' }}>{value || '—'}</span>
    </div>
  )
}
