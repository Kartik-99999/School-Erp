"use client";
import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, ShieldOff, Copy, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import {
  getTwoFactorStatus,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  type TwoFactorStatus,
  type TwoFactorSetup,
} from "@/lib/api/twoFactor";

type Mode = "idle" | "setup" | "recovery";

const detail = (e: any, fallback: string): string => e?.response?.data?.detail || fallback;

/**
 * Self-contained 2FA (TOTP) enrollment + management card. Drop it into any settings
 * page for a logged-in user. Talks to /auth/2fa/* via the shared axios client (which
 * attaches the session's access token).
 */
export default function TwoFactorSettings() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showDisable, setShowDisable] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    try {
      setStatus(await getTwoFactorStatus());
    } catch (e: any) {
      setError(detail(e, "Couldn't load your 2FA status."));
    }
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  const startSetup = async () => {
    setError("");
    setBusy(true);
    try {
      setSetupData(await setupTwoFactor());
      setCode("");
      setMode("setup");
    } catch (e: any) {
      setError(detail(e, "Couldn't start 2FA setup."));
    } finally {
      setBusy(false);
    }
  };

  const confirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await enableTwoFactor(code.trim());
      setRecoveryCodes(res.recovery_codes);
      setSetupData(null);
      setCode("");
      setMode("recovery");
    } catch (e: any) {
      setError(detail(e, "That code didn't work. Try again with a fresh one."));
    } finally {
      setBusy(false);
    }
  };

  const cancelSetup = async () => {
    setMode("idle");
    setSetupData(null);
    setCode("");
    setError("");
    await refresh();
  };

  const finishRecovery = async () => {
    setMode("idle");
    setRecoveryCodes([]);
    await refresh();
  };

  const confirmDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await disableTwoFactor(password);
      setShowDisable(false);
      setPassword("");
      await refresh();
    } catch (e: any) {
      setError(detail(e, "Couldn't disable 2FA."));
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const remaining = status?.recovery_codes_remaining ?? 0;

  return (
    <section className="bg-surface-card rounded-card border border-border shadow-card p-6">
      <div className="flex items-start gap-3 mb-4">
        <ShieldCheck className="text-primary-600 mt-0.5 shrink-0" size={20} />
        <div>
          <h2 className="text-base font-semibold text-ink">Two-Factor Authentication</h2>
          <p className="text-sm text-ink-muted">
            Require a one-time code from an authenticator app when you sign in. Protects your
            personal account.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : status?.enabled ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 text-xs font-medium">
              <ShieldCheck size={14} /> Enabled
            </span>
            <span className="text-ink-muted">
              {remaining} recovery code{remaining === 1 ? "" : "s"} remaining
            </span>
          </div>

          {!showDisable ? (
            <Button
              variant="danger"
              onClick={() => {
                setShowDisable(true);
                setError("");
              }}
            >
              <ShieldOff size={16} /> Disable 2FA
            </Button>
          ) : (
            <form onSubmit={confirmDisable} className="space-y-3 max-w-sm">
              <div>
                <Label htmlFor="disable-pw">Confirm your password to disable</Label>
                <Input
                  id="disable-pw"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="danger" disabled={busy}>
                  {busy ? "Disabling…" : "Disable 2FA"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowDisable(false);
                    setPassword("");
                    setError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : mode === "setup" && setupData ? (
        <form onSubmit={confirmEnable} className="space-y-4">
          <ol className="text-sm text-ink-muted list-decimal ml-5 space-y-1">
            <li>Scan this QR code with an authenticator app (Google Authenticator, Authy…).</li>
            <li>Enter the 6-digit code it shows to confirm.</li>
          </ol>
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="bg-white p-3 rounded-input border border-border">
              <QRCodeSVG value={setupData.provisioning_uri} size={168} />
            </div>
            <div className="text-sm">
              <p className="text-ink-muted mb-1">Can&apos;t scan? Enter this key manually:</p>
              <code className="block bg-surface rounded px-2 py-1 text-ink break-all border border-border">
                {setupData.secret}
              </code>
            </div>
          </div>
          <div className="max-w-xs">
            <Label htmlFor="totp">Verification code</Label>
            <Input
              id="totp"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className="text-center tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Verifying…" : "Verify & enable"}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelSetup}>
              Cancel
            </Button>
          </div>
        </form>
      ) : mode === "recovery" ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p>
              Save these recovery codes somewhere safe. Each works once if you lose access to your
              authenticator. <strong>They won&apos;t be shown again.</strong>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 max-w-md font-mono text-sm">
            {recoveryCodes.map((c) => (
              <code
                key={c}
                className="bg-surface border border-border rounded px-2 py-1 text-ink text-center"
              >
                {c}
              </code>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={copyCodes}>
              {copied ? (
                <>
                  <Check size={16} /> Copied
                </>
              ) : (
                <>
                  <Copy size={16} /> Copy codes
                </>
              )}
            </Button>
            <Button type="button" onClick={finishRecovery}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            2FA is currently <span className="font-medium text-ink">off</span>.
          </p>
          <Button onClick={startSetup} disabled={busy}>
            <ShieldCheck size={16} /> {busy ? "Starting…" : "Enable 2FA"}
          </Button>
        </div>
      )}
    </section>
  );
}
