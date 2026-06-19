"use client";
import React, { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { getFeeOptions, updateFeeOptions, type FeeOptions } from "@/lib/api/settings";

// Pydantic 422s come back as a list of {msg}; surface the message(s).
function errText(e: any, fallback: string): string {
  const d = e?.response?.data?.detail;
  if (Array.isArray(d)) return d.map((x: any) => x?.msg || "").filter(Boolean).join("; ") || fallback;
  return typeof d === "string" ? d : fallback;
}

/**
 * Per-school display/redirect fee options (external payment URL + bank transfer details),
 * alongside the Razorpay Payment Gateway card. These are non-secret and editable in place;
 * the server validates IFSC / account number / URL (422 on bad input).
 */
export default function FeePaymentOptionsSettings() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState<FeeOptions | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const set = (k: keyof FeeOptions, v: any) => setOpts((p) => (p ? { ...p, [k]: v } : p));

  const refresh = async () => {
    try {
      setOpts(await getFeeOptions());
    } catch (e: any) {
      setError(errText(e, "Couldn't load fee options."));
    }
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opts) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await updateFeeOptions({
        external_payment_enabled: opts.external_payment_enabled,
        external_payment_url: opts.external_payment_url || "",
        bank_transfer_enabled: opts.bank_transfer_enabled,
        bank_name: opts.bank_name || "",
        bank_account_number: opts.bank_account_number || "",
        bank_ifsc: opts.bank_ifsc || "",
        bank_branch: opts.bank_branch || "",
        bank_account_holder: opts.bank_account_holder || "",
        bank_upi_id: opts.bank_upi_id || "",
      });
      setOpts(saved);
      setMessage("Fee options saved.");
    } catch (e: any) {
      setError(errText(e, "Couldn't save fee options."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-surface-card rounded-card border border-border shadow-card p-6">
      <div className="flex items-start gap-3 mb-4">
        <Landmark className="text-primary-600 mt-0.5 shrink-0" size={20} />
        <div>
          <h2 className="text-base font-semibold text-ink">Fee Payment Options</h2>
          <p className="text-sm text-ink-muted">
            Extra ways for parents to pay, alongside Razorpay. These are display/redirect only —
            payment happens off-platform and is reconciled by recording it manually (no
            auto-receipt).
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
          {message}
        </div>
      )}

      {loading || !opts ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <form onSubmit={save} className="space-y-6">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary-600"
                checked={opts.external_payment_enabled}
                onChange={(e) => set("external_payment_enabled", e.target.checked)}
              />
              <span className="font-medium">External payment site</span>
            </label>
            <div className="max-w-xl">
              <Label htmlFor="ext-url">Payment URL (parents are redirected here)</Label>
              <Input
                id="ext-url"
                placeholder="https://pay.yourschool.edu"
                value={opts.external_payment_url || ""}
                onChange={(e) => set("external_payment_url", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-5">
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary-600"
                checked={opts.bank_transfer_enabled}
                onChange={(e) => set("bank_transfer_enabled", e.target.checked)}
              />
              <span className="font-medium">Bank transfer details (NEFT / IMPS / UPI)</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Account holder</Label>
                <Input
                  value={opts.bank_account_holder || ""}
                  onChange={(e) => set("bank_account_holder", e.target.value)}
                />
              </div>
              <div>
                <Label>Bank name</Label>
                <Input
                  value={opts.bank_name || ""}
                  onChange={(e) => set("bank_name", e.target.value)}
                />
              </div>
              <div>
                <Label>Account number</Label>
                <Input
                  placeholder="9–18 digits"
                  value={opts.bank_account_number || ""}
                  onChange={(e) => set("bank_account_number", e.target.value)}
                />
              </div>
              <div>
                <Label>IFSC</Label>
                <Input
                  placeholder="HDFC0001234"
                  value={opts.bank_ifsc || ""}
                  onChange={(e) => set("bank_ifsc", e.target.value)}
                />
              </div>
              <div>
                <Label>Branch</Label>
                <Input
                  value={opts.bank_branch || ""}
                  onChange={(e) => set("bank_branch", e.target.value)}
                />
              </div>
              <div>
                <Label>UPI ID</Label>
                <Input
                  placeholder="school@bank"
                  value={opts.bank_upi_id || ""}
                  onChange={(e) => set("bank_upi_id", e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save fee options"}
          </Button>
        </form>
      )}
    </section>
  );
}
