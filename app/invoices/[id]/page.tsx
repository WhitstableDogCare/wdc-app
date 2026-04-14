'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import InvoicePrint, { type ServiceLine, type BusinessSettings } from '@/app/components/InvoicePrint'

interface Invoice {
  id: number
  invoice_number: string
  dog_id: number | null
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  client_address: string | null
  dog_name: string | null
  dog_breed: string | null
  services: string
  notes: string | null
  invoice_date: string | null
  due_date: string | null
  apply_discount: boolean
  total: number
  status: string
  paid_date: string | null
}

interface Config {
  businessName?: string
  businessAddress?: string
  businessEmail?: string
  businessPhone?: string
  paymentInfo?: string
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [config, setConfig] = useState<Config>({})
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [togglingPaid, setTogglingPaid] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [emailResult, setEmailResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/invoices/${id}`).then(r => r.json()),
      fetch('/api/config').then(r => r.json()),
    ]).then(([inv, cfg]) => {
      setInvoice(inv)
      setConfig(cfg)
      setEmailTo(inv.client_email ?? '')
      setLoading(false)
    })
  }, [id])

  const handleSendEmail = async () => {
    setSending(true)
    setEmailResult(null)
    try {
      const res = await fetch(`/api/invoices/${id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, message: emailMessage }),
      })
      const data = await res.json()
      if (res.ok) {
        setEmailResult({ ok: true, msg: `Invoice sent to ${emailTo}` })
      } else {
        setEmailResult({ ok: false, msg: data.error ?? 'Failed to send email' })
      }
    } catch {
      setEmailResult({ ok: false, msg: 'Network error — could not send email' })
    }
    setSending(false)
  }

  const handleTogglePaid = async () => {
    if (!invoice) return
    setTogglingPaid(true)
    const isPaid = invoice.status === 'Paid'
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: isPaid ? 'Unpaid' : 'Paid',
        paid_date: isPaid ? null : new Date().toISOString().split('T')[0],
      }),
    })
    const updated = await res.json()
    setInvoice(inv => inv ? { ...inv, status: updated.status, paid_date: updated.paid_date } : inv)
    setTogglingPaid(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    router.push('/invoices')
  }

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>
  if (!invoice) return <div className="text-center py-16 text-gray-500">Invoice not found</div>

  const services: ServiceLine[] = (() => { try { return JSON.parse(invoice.services) } catch { return [] } })()

  const business: BusinessSettings = {
    name: config.businessName ?? 'Whitstable Dog Care',
    address: config.businessAddress ?? '',
    email: config.businessEmail ?? '',
    phone: config.businessPhone ?? '',
    paymentInfo: config.paymentInfo ?? '',
  }

  const invoiceData = {
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date ?? '',
    dueDate: invoice.due_date ?? '',
    clientName: invoice.client_name ?? '',
    clientEmail: invoice.client_email ?? '',
    clientPhone: invoice.client_phone ?? '',
    clientAddress: invoice.client_address ?? '',
    dogName: invoice.dog_name ?? '',
    dogBreed: invoice.dog_breed ?? '',
    services,
    notes: invoice.notes ?? '',
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Action bar - hidden on print */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/bookings" className="text-sm text-[#2d6a4f] hover:underline">← Invoices</Link>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${invoice.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {invoice.status === 'Paid' ? `✓ Paid${invoice.paid_date ? ` · ${new Date(invoice.paid_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}` : 'Unpaid'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Primary actions */}
          <button
            onClick={handleTogglePaid}
            disabled={togglingPaid}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60 ${invoice.status === 'Paid' ? 'border border-gray-200 text-gray-600 hover:bg-gray-50' : 'bg-green-600 text-white hover:bg-green-700'}`}
          >
            {togglingPaid ? '...' : invoice.status === 'Paid' ? 'Mark Unpaid' : 'Mark as Paid'}
          </button>
          <button
            onClick={() => { setShowEmailModal(true); setEmailResult(null) }}
            className="text-sm border border-[#2d6a4f] text-[#2d6a4f] px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors font-medium"
          >
            Email
          </button>
          <button
            onClick={() => window.print()}
            className="text-sm bg-[#2d6a4f] text-white px-3 py-1.5 rounded-lg hover:bg-[#245a41] transition-colors font-medium"
          >
            Print / PDF
          </button>

          {/* ⋯ dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(m => !m)}
              className="text-sm border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              ⋯
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                  <Link
                    href={`/invoices/${id}/edit`}
                    onClick={() => setShowMenu(false)}
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Edit invoice
                  </Link>
                  {invoice.dog_id && (
                    <Link
                      href={`/invoices/new?dogId=${invoice.dog_id}`}
                      onClick={() => setShowMenu(false)}
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      New invoice for same dog
                    </Link>
                  )}
                  <button
                    onClick={() => { setShowMenu(false); handleDelete() }}
                    disabled={deleting}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100"
                  >
                    {deleting ? 'Deleting...' : 'Delete invoice'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>


      {/* Invoice */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <InvoicePrint invoice={invoiceData} business={business} applyDiscount={invoice.apply_discount} />
      </div>

      {/* Email modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-[#2d2d4e] mb-4">Email Invoice #{invoice.invoice_number}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
                <textarea
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  rows={4}
                  placeholder={`Please find your invoice #${invoice.invoice_number} attached.\n\nThank you for staying with Whitstable Dog Care!\n\nJack\nWhitstable Dog Care`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none"
                />
              </div>

              {emailResult && (
                <p className={`text-sm px-3 py-2 rounded-lg ${emailResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {emailResult.msg}
                </p>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleSendEmail}
                disabled={sending || !emailTo}
                className="flex-1 bg-[#2d6a4f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#245a41] transition-colors disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Invoice'}
              </button>
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
