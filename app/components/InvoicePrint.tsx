"use client";

export interface ServiceLine {
  id: string;
  type: "boarding" | "daycare";
  description: string;
  startDate: string;
  endDate: string;
  quantity: number;
  rate: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  dogName: string;
  dogBreed: string;
  services: ServiceLine[];
  notes: string;
}

export interface BusinessSettings {
  name: string;
  address: string;
  email: string;
  phone: string;
  paymentInfo: string;
}

function fmt(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function nights(s: ServiceLine): number {
  if (s.type !== "boarding" || !s.startDate || !s.endDate) return s.quantity;
  const diff = Math.round(
    (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 86400000
  );
  return Math.max(0, diff);
}

function serviceAmount(s: ServiceLine): number {
  return nights(s) * s.rate;
}

function qtyLabel(s: ServiceLine): string {
  const n = nights(s);
  return s.type === "boarding"
    ? `${n} night${n !== 1 ? "s" : ""}`
    : `${n} day${n !== 1 ? "s" : ""}`;
}

function dateRange(s: ServiceLine): string {
  if (!s.startDate) return "";
  if (s.type === "boarding" && s.endDate)
    return `${fmt(s.startDate)} – ${fmt(s.endDate)}`;
  return fmt(s.startDate);
}

export default function InvoicePrint({
  invoice,
  business,
  applyDiscount = false,
}: {
  invoice: InvoiceData;
  business: BusinessSettings;
  applyDiscount?: boolean;
}) {
  const subtotal = invoice.services.reduce((sum, s) => sum + serviceAmount(s), 0);
  const total = applyDiscount ? subtotal * 0.9 : subtotal;

  return (
    <div className="bg-white p-10 max-w-2xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <img src="/wdc-logo.png" alt="Whitstable Dog Care" className="max-h-16 max-w-48 object-contain mb-2" />
          <h1 className="text-xl font-bold text-slate-900">
            {business.name || "Whitstable Dog Care"}
          </h1>
          {business.address && (
            <p className="text-sm text-slate-500 mt-1 whitespace-pre-line">{business.address}</p>
          )}
          {business.phone && <p className="text-sm text-slate-500">{business.phone}</p>}
          {business.email && <p className="text-sm text-slate-500">{business.email}</p>}
        </div>
        <div className="text-right">
          <p className="text-3xl font-light text-slate-300 uppercase tracking-widest">Invoice</p>
          <p className="text-sm font-semibold text-slate-700 mt-1">#{invoice.invoiceNumber || "—"}</p>
          {invoice.invoiceDate && <p className="text-sm text-slate-500">Date: {fmt(invoice.invoiceDate)}</p>}
          {invoice.dueDate && <p className="text-sm text-slate-500">Due: {fmt(invoice.dueDate)}</p>}
        </div>
      </div>

      <hr className="border-slate-200 mb-6" />

      {/* Bill to */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Bill To</p>
        {invoice.clientName && <p className="font-semibold text-slate-900">{invoice.clientName}</p>}
        {invoice.clientEmail && <p className="text-sm text-slate-600">{invoice.clientEmail}</p>}
        {invoice.clientPhone && <p className="text-sm text-slate-600">{invoice.clientPhone}</p>}
        {invoice.clientAddress && (
          <p className="text-sm text-slate-600 whitespace-pre-line">{invoice.clientAddress}</p>
        )}
        {(invoice.dogName || invoice.dogBreed) && (
          <p className="text-sm text-slate-600 mt-2">
            🐾 <span className="font-medium">{invoice.dogName}</span>
            {invoice.dogBreed ? ` (${invoice.dogBreed})` : ""}
          </p>
        )}
      </div>

      {/* Services */}
      {invoice.services.length > 0 && (
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400 bg-slate-50">Service</th>
              <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400 bg-slate-50">Dates</th>
              <th className="text-right py-2 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400 bg-slate-50">Qty</th>
              <th className="text-right py-2 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400 bg-slate-50">Rate</th>
              <th className="text-right py-2 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400 bg-slate-50">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.services.map((s) => (
              <tr key={s.id} className="border-b border-slate-100">
                <td className="py-3 px-3 text-slate-800">{s.description || (s.type === "boarding" ? "Dog Boarding" : "Dog Daycare")}</td>
                <td className="py-3 px-3 text-slate-500">{dateRange(s)}</td>
                <td className="py-3 px-3 text-slate-500 text-right">{qtyLabel(s)}</td>
                <td className="py-3 px-3 text-slate-500 text-right">£{s.rate.toFixed(2)}</td>
                <td className="py-3 px-3 text-slate-800 font-medium text-right">£{serviceAmount(s).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {applyDiscount && (
              <>
                <tr>
                  <td colSpan={4} className="text-right py-1 px-3 text-sm text-slate-500">Subtotal</td>
                  <td className="text-right py-1 px-3 text-sm text-slate-500">£{subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="text-right py-1 px-3 text-sm text-slate-500">Loyalty discount (10%)</td>
                  <td className="text-right py-1 px-3 text-sm text-slate-500">−£{(subtotal * 0.1).toFixed(2)}</td>
                </tr>
              </>
            )}
            <tr>
              <td colSpan={4} className="text-right py-3 px-3 font-semibold text-slate-700">Total</td>
              <td className="text-right py-3 px-3 text-lg font-bold text-slate-900">£{total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      )}

      {invoice.notes && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Notes</p>
          <p className="text-sm text-slate-600 whitespace-pre-line">{invoice.notes}</p>
        </div>
      )}

      {business.paymentInfo && (
        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Payment Details</p>
          <p className="text-sm text-slate-600 whitespace-pre-line">{business.paymentInfo}</p>
        </div>
      )}

      <p className="text-center text-xs text-slate-300 mt-8">Thank you for your business!</p>
    </div>
  );
}
