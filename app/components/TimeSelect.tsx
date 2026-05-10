'use client'

function buildTimes(minHour: number, maxHour: number): string[] {
  const times: string[] = []
  for (let h = minHour; h <= maxHour; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === maxHour && m > 0) break
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return times
}

export default function TimeSelect({
  value,
  onChange,
  style,
  minHour = 0,
  maxHour = 23,
}: {
  value: string
  onChange: (value: string) => void
  style?: React.CSSProperties
  minHour?: number
  maxHour?: number
}) {
  const times = buildTimes(minHour, maxHour)
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
