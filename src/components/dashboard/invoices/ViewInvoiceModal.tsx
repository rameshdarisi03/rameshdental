"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Invoice } from "@/lib/invoicesDb";
import { X, Download, MessageSquare, Receipt, CheckCircle2, Clock, Ban, Mail, Loader2 } from "lucide-react";

export interface ViewInvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onDownload: () => void;
  onEmail?: () => void;
  isEmailing?: boolean;
  whatsappUrl: string;
}

export default function ViewInvoiceModal({
  invoice,
  onClose,
  onDownload,
  onEmail,
  isEmailing,
  whatsappUrl
}: ViewInvoiceModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Smartphone native back-button interception
  useEffect(() => {
    if (!invoice) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    window.history.pushState({ modalOpen: "viewInvoiceModal" }, "");
    const handlePopState = () => onClose();
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener("popstate", handlePopState);
      if (window.history.state?.modalOpen === "viewInvoiceModal") {
        window.history.back();
      }
    };
  }, [invoice, onClose]);

  if (!mounted || !invoice || typeof window === "undefined" || !document?.body) return null;

  const isPaid = invoice.status === "paid";
  const isVoided = invoice.status === "voided" || invoice.status === "cancelled";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in font-['Inter',sans-serif]">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-brand-green text-white flex items-center justify-center font-black text-xs shadow-sm">
              GPC
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Invoice</h3>
              <p className="text-[10px] font-bold text-slate-500">{invoice.invoiceNumber.replace(/^#+/, "")}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Invoice Voucher Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900 dark:text-white">
          
          {/* Top Row: Clinic & Patient */}
          <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-white p-1 shadow-2xs">
                <img
                  src="/images/gait_physio_emblem.png"
                  alt="Gait Physio Clinic"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h4 className="font-black text-brand-green text-base tracking-tight leading-none">Gait Physio Clinic</h4>
                <p className="text-[10px] font-black text-teal-700 dark:text-teal-400 tracking-wider uppercase mt-1">
                  Neuro Rehab &nbsp;|&nbsp; Ortho Rehab &nbsp;|&nbsp; Sports Rehab
                </p>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">
                  Shop No. 26 (2nd Flr) & Shop No. 06 (3rd Flr), ITPL Main Rd, Whitefield, Bengaluru - 560066 • +91 89044 56243
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                isPaid 
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : isVoided
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
              }`}>
                {invoice.status.toUpperCase()}
              </span>
              <p className="text-[10px] font-bold text-slate-400 mt-1">Date: {invoice.serviceDate}</p>
            </div>
          </div>

          {/* Replacement / Cancellation Notices */}
          {invoice.replacesInvoiceNumber && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <span className="font-bold text-sm">🔄</span>
              <span>
                <strong>Replacement Invoice:</strong> Replaces cancelled bill <strong>{invoice.replacesInvoiceNumber.replace(/^#+/, "")}</strong>. Patient has not been charged twice.
              </span>
            </div>
          )}

          {invoice.replacedByInvoiceNumber && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <span className="font-bold text-sm">⚠️</span>
              <span>
                <strong>Voided Bill:</strong> This invoice was cancelled and replaced by updated bill <strong>{invoice.replacedByInvoiceNumber.replace(/^#+/, "")}</strong>.
              </span>
            </div>
          )}

          {isVoided && invoice.voidReason && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Cancellation Reason:</strong> {invoice.voidReason}
            </div>
          )}

          {/* Bill To & Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bill To Patient:</p>
              <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">{invoice.patientName}</p>
              <p className="text-[10px] font-bold text-slate-500">{invoice.patientId || "PID: ----"}</p>
              {invoice.patientPhone && <p className="text-[10px] font-bold text-slate-500">{invoice.patientPhone}</p>}
            </div>

            <div className="space-y-1 sm:text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Consultation Details:</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Therapist: <span className="font-black text-brand-green">{invoice.therapistName || "Dr. Kinnera"}</span>
              </p>
              <p className="text-[10px] font-bold text-slate-500">
                Method: <span className="text-slate-800 dark:text-slate-200">{invoice.paymentMethod || "UPI"}</span>
              </p>
              {invoice.dueDate && (
                <p className="text-[10px] font-bold text-slate-500">
                  Due: <span className="text-slate-800 dark:text-slate-200">{invoice.dueDate}</span>
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-brand-green text-[10px] font-black uppercase text-slate-500">
                  <th className="py-2">Service Description</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(invoice.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">{item.description}</td>
                    <td className="py-2.5 text-center font-bold text-slate-500">{item.quantity || 1}</td>
                    <td className="py-2.5 text-right font-black text-slate-900 dark:text-white">
                      ₹{(item.amount || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{(invoice.subtotal || 0).toLocaleString("en-IN")}</span>
            </div>
            {(invoice.taxRate || 0) > 0 ? (
              <div className="flex justify-between">
                <span>GST ({invoice.taxRate}%)</span>
                <span>₹{(invoice.taxAmount || 0).toLocaleString("en-IN")}</span>
              </div>
            ) : (
              <div className="flex justify-between text-slate-400">
                <span>GST / Tax</span>
                <span>0% (Exempt)</span>
              </div>
            )}
            {(invoice.discount || 0) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount Applied</span>
                <span>-₹{(invoice.discount || 0).toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t-2 border-brand-green font-black text-slate-900 dark:text-white text-sm">
              <span>Total Amount</span>
              <span className="text-brand-green dark:text-emerald-400 text-base font-black">
                ₹{(invoice.totalAmount || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {invoice.notes && (
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl text-[11px] text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Clinical Notes & Diagnosis:</strong> {invoice.notes}
            </div>
          )}

        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
          {invoice.patientPhone && !isVoided && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <MessageSquare className="h-4 w-4" />
              <span>WhatsApp</span>
            </a>
          )}
          {invoice.patientEmail && !isVoided && onEmail && (
            <button
              type="button"
              onClick={onEmail}
              disabled={isEmailing}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              title={`Email PDF to ${invoice.patientEmail}`}
            >
              {isEmailing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              <span>{isEmailing ? "Sending..." : "Email PDF"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onDownload}
            className="px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
