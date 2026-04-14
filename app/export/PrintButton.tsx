'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{ background: '#fff', color: '#2d6a4f', border: 'none', padding: '8px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
    >
      🖨️ Print / Save as PDF
    </button>
  )
}
