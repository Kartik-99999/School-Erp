"use client";
import React, { useEffect, useState } from "react";
import { DollarSign, CreditCard, Clock, FileText, ExternalLink, Landmark } from "lucide-react";
import {
  getMyFees,
  initiateOnlinePayment,
  verifyOnlinePayment,
  getPaymentOptions,
  type PaymentOptions,
} from "@/lib/api/studentPortal";

const loadRazorpay = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const fmt = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export default function StudentFeesPage() {
  const [loading, setLoading] = useState(true);
  const [dues, setDues] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ total_due: 0, total_paid: 0, balance: 0 });
  const [studentId, setStudentId] = useState<string>("");
  const [paying, setPaying] = useState(false);
  const [options, setOptions] = useState<PaymentOptions | null>(null);

  const load = async () => {
    try {
      const res = await getMyFees();
      setStudentId(res.data.student_id || "");
      setDues(res.data.dues || []);
      setReceipts(res.data.receipts || []);
      setSummary(res.data.summary || {});
      try {
        setOptions(await getPaymentOptions());
      } catch (e) {
        console.error("Failed to load payment options", e);
      }
    } catch (e) {
      console.error("Failed to load fees", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePayNow = async () => {
    const allocations = dues
      .filter((d) => d.status !== "Paid" && Number(d.balance) > 0)
      .map((d) => ({ fee_schedule_id: d.id, amount: Number(d.balance) }));
    const total = allocations.reduce((s, a) => s + a.amount, 0);
    if (total <= 0) return alert("You have no outstanding dues.");

    setPaying(true);
    try {
      const init = await initiateOnlinePayment(total, studentId, allocations);
      const order = init.data.order;
      const keyId = init.data.key_id;
      const ok = await loadRazorpay();
      if (!ok) {
        alert("Could not load the payment gateway. Check your connection.");
        setPaying(false);
        return;
      }
      const rzp = new (window as any).Razorpay({
        key: keyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "School Fees",
        description: "Fee payment",
        handler: async (resp: any) => {
          try {
            await verifyOnlinePayment({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              student_id: studentId,
            });
            alert("Payment successful! Your dues have been updated.");
            await load();
          } catch (e: any) {
            alert(e?.response?.data?.detail || "Payment verification failed.");
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
        theme: { color: "#dc2626" },
      });
      rzp.open();
      // Note: do NOT reset `paying` here — the checkout modal is now open.
      // It's reset on dismiss, on verify completion, or in the catch below.
    } catch (e: any) {
      alert(
        e?.response?.data?.detail ||
          "Online payments are not configured. Please contact the office."
      );
      setPaying(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-ink">Fees &amp; Payments</h2>
        <p className="text-ink-muted mt-1">View your fee breakdown and download receipts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-red-500 to-rose-600 p-8 rounded-card text-white shadow-lg shadow-red-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20">
            <Clock className="w-24 h-24" />
          </div>
          <p className="text-red-100 font-bold mb-2 uppercase tracking-wider text-sm">
            Outstanding Balance
          </p>
          <p className="text-5xl font-bold mb-4">{loading ? "…" : inr(summary.balance)}</p>
          {!loading && Number(summary.balance) > 0 && options?.razorpay?.enabled && (
            <button
              onClick={handlePayNow}
              disabled={paying}
              className="px-6 py-3 bg-surface-card text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center gap-2 shadow-sm w-max disabled:opacity-60"
            >
              <CreditCard className="w-5 h-5" /> {paying ? "Processing..." : "Pay Now Online"}
            </button>
          )}
        </div>
        <div className="bg-surface-card p-8 rounded-card border border-border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <DollarSign className="w-24 h-24 text-emerald-600" />
          </div>
          <p className="text-ink-muted font-bold mb-2 uppercase tracking-wider text-sm">
            Total Paid
          </p>
          <p className="text-5xl font-bold text-ink mb-2">
            {loading ? "…" : inr(summary.total_paid)}
          </p>
        </div>
      </div>

      {!loading &&
        options &&
        (options.external.enabled ||
          options.bank.enabled ||
          (!options.razorpay.enabled &&
            !options.external.enabled &&
            !options.bank.enabled)) && (
          <div className="bg-surface-card rounded-card shadow-sm border border-border p-6 space-y-4">
            <h3 className="text-lg font-bold text-ink">Ways to Pay</h3>
            {!options.razorpay.enabled &&
            !options.external.enabled &&
            !options.bank.enabled ? (
              <p className="text-sm text-ink-muted">
                Online payment isn’t available right now — please contact the school office to
                pay your fees.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.external.enabled && options.external.url && (
                  <div className="border border-border rounded-input p-4">
                    <p className="font-semibold text-ink flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" /> Pay on the school’s portal
                    </p>
                    <p className="text-sm text-ink-muted mt-1">
                      You’ll be redirected to the school’s own payment site.
                    </p>
                    <a
                      href={options.external.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block px-4 py-2 bg-primary-600 text-white rounded-btn text-sm font-medium hover:bg-primary-700"
                    >
                      Open payment site
                    </a>
                  </div>
                )}
                {options.bank.enabled && (
                  <div className="border border-border rounded-input p-4 md:col-span-2">
                    <p className="font-semibold text-ink flex items-center gap-2">
                      <Landmark className="w-4 h-4" /> Bank transfer (NEFT / IMPS / UPI)
                    </p>
                    <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      {options.bank.account_holder && (
                        <div>
                          <dt className="inline text-ink-muted">Account holder: </dt>
                          <dd className="inline text-ink font-medium">
                            {options.bank.account_holder}
                          </dd>
                        </div>
                      )}
                      {options.bank.bank_name && (
                        <div>
                          <dt className="inline text-ink-muted">Bank: </dt>
                          <dd className="inline text-ink font-medium">{options.bank.bank_name}</dd>
                        </div>
                      )}
                      {options.bank.account_number && (
                        <div>
                          <dt className="inline text-ink-muted">A/C no: </dt>
                          <dd className="inline text-ink font-medium">
                            {options.bank.account_number}
                          </dd>
                        </div>
                      )}
                      {options.bank.ifsc && (
                        <div>
                          <dt className="inline text-ink-muted">IFSC: </dt>
                          <dd className="inline text-ink font-medium">{options.bank.ifsc}</dd>
                        </div>
                      )}
                      {options.bank.branch && (
                        <div>
                          <dt className="inline text-ink-muted">Branch: </dt>
                          <dd className="inline text-ink font-medium">{options.bank.branch}</dd>
                        </div>
                      )}
                      {options.bank.upi_id && (
                        <div>
                          <dt className="inline text-ink-muted">UPI: </dt>
                          <dd className="inline text-ink font-medium">{options.bank.upi_id}</dd>
                        </div>
                      )}
                    </dl>
                    <p className="text-xs text-ink-muted mt-2">
                      After paying, the school office will record your receipt.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      <div className="bg-surface-card rounded-card shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-bold text-ink">Fee Schedule</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface/50">
              {["Fee Head", "Due Date", "Amount", "Paid", "Balance", "Status"].map((h) => (
                <th
                  key={h}
                  className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {dues.map((d) => (
              <tr
                key={d.id}
                className={`hover:bg-surface ${d.status !== "Paid" ? "bg-red-50/20" : ""}`}
              >
                <td className="p-4 font-bold text-ink">{d.head}</td>
                <td className="p-4 text-ink-muted">{fmt(d.due_date)}</td>
                <td className="p-4 text-ink font-bold">{inr(d.net_due_amount)}</td>
                <td className="p-4 text-ink-muted">{inr(d.amount_paid)}</td>
                <td className="p-4 font-bold text-ink">{inr(d.balance)}</td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      d.status === "Paid"
                        ? "bg-emerald-50 text-emerald-700"
                        : d.status === "Partial"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {d.status}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && dues.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-ink-muted">
                  No fee schedule found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-surface-card rounded-card shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-bold text-ink">Payment Receipts</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface/50">
              {["Receipt No", "Date", "Mode", "Amount"].map((h) => (
                <th
                  key={h}
                  className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {receipts.map((r) => (
              <tr key={r.id} className="hover:bg-surface">
                <td className="p-4 font-bold text-ink flex items-center gap-2">
                  <FileText className="w-4 h-4 text-ink-faint" />
                  {r.receipt_number}
                </td>
                <td className="p-4 text-ink-muted">{fmt(r.payment_date)}</td>
                <td className="p-4 text-ink-muted">{r.payment_mode}</td>
                <td className="p-4 font-bold text-emerald-600">{inr(r.total_amount)}</td>
              </tr>
            ))}
            {!loading && receipts.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-ink-muted">
                  No receipts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
