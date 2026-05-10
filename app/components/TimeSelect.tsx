'use client'

const times: string[] = []
for (let h = 7; h <= 21; h++) {
  for (const m of [0, 15, 30, 45]) {
    if (h === 21 && m > 0) break
    times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

export default function TimeSelect({
  value,
  onChange,
  style,
}: {
  value: string
  onChange: (value: string) => void
  style?: React.CSSProperties
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', boxSizing: 'border-box', ...style }}
    >
      <option value="">—</option>
      {times.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  )
}
