"use client";
import React, { useEffect, useState } from "react";
import { CreditCard, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import {
  getPaymentGateway,
  updatePaymentGateway,
  type PaymentGatewayStatus,
} from "@/lib/api/settings";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Per-school Razorpay configuration. Each school collects fees into its OWN account, so
 * this stores the school's key_id / key_secret / webhook_secret (secrets are write-only)
 * and shows the school-specific webhook URL to paste into the Razorpay dashboard.
 */
export default function PaymentGatewaySettings({ schoolId }: { schoolId?: string }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<PaymentGatewayStatus | null>(null);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const webhookUrl = schoolId ? `${API_BASE}/fees/payments/online/webhook/${schoolId}` : "";

  const refresh = async () => {
    try {
      const s = await getPaymentGateway();
      setStatus(s);
      setKeyId(s.key_id || "");
      setEnabled(s.enabled);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Couldn't load payment settings.");
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
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const s = await updatePaymentGateway({
        key_id: keyId,
        key_secret: keySecret || undefined,
        webhook_secret: webhookSecret || undefined,
        enabled,
      });
      setStatus(s);
      setKeySecret("");
      setWebhookSecret("");
      setMessage("Payment gateway saved.");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Couldn't save payment settings.");
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section className="bg-surface-card rounded-card border border-border shadow-card p-6">
      <div className="flex items-start gap-3 mb-4">
        <CreditCard className="text-primary-600 mt-0.5 shrink-0" size={20} />
        <div>
          <h2 className="text-base font-semibold text-ink">Payment Gateway (Razorpay)</h2>
          <p className="text-sm text-ink-muted">
            Collect fees into <span className="font-medium text-ink">your school&apos;s own</span>{" "}
            Razorpay account. Funds settle to your bank — the platform never holds them.
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

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label htmlFor="rzp-key-id">Key ID</Label>
              <Input
                id="rzp-key-id"
                placeholder="rzp_live_xxxxxxxx"
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="rzp-key-secret">Key Secret</Label>
              <Input
                id="rzp-key-secret"
                type="password"
                autoComplete="off"
                placeholder={
                  status?.has_key_secret ? "•••••••• (set — blank to keep)" : "Enter key secret"
                }
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="rzp-webhook-secret">Webhook Secret</Label>
              <Input
                id="rzp-webhook-secret"
                type="password"
                autoComplete="off"
                placeholder={
                  status?.has_webhook_secret
                    ? "•••••••• (set — blank to keep)"
                    : "Choose a webhook secret"
                }
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary-600"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                Enable online payments
              </label>
            </div>
          </div>

          <div className="rounded-input border border-border bg-surface p-4 text-sm">
            <p className="font-medium text-ink mb-1">Your webhook URL</p>
            <p className="text-ink-muted mb-2">
              In your Razorpay dashboard → Settings → Webhooks, add this URL with the same
              webhook secret and subscribe to <code className="text-ink">payment.captured</code> +{" "}
              <code className="text-ink">order.paid</code>.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all bg-surface-card border border-border rounded px-2 py-1 text-ink">
                {webhookUrl || "—"}
              </code>
              {webhookUrl && (
                <Button type="button" variant="secondary" size="sm" onClick={copyUrl}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              )}
            </div>
          </div>

          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save payment settings"}
          </Button>
        </form>
      )}
    </section>
  );
}
