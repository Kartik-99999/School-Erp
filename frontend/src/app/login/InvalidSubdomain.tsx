import { Building2, AlertTriangle } from "lucide-react";
import { BASE_DOMAIN } from "@/lib/config";

export default function InvalidSubdomain({ subdomain }: { subdomain?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 font-sans">
      <div className="bg-surface-card w-full max-w-md rounded-card border border-border shadow-card p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-danger-bg text-danger-text flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-bold text-ink">School not found</h1>
        <p className="text-sm text-ink-muted mt-2">
          {subdomain ? (
            <>
              No school is registered at <span className="font-semibold text-ink">{subdomain}</span>
              . Please check the web address your school gave you.
            </>
          ) : (
            <>
              This school portal address isn&apos;t recognised. Please check the link and try again.
            </>
          )}
        </p>

        <div className="mt-6 rounded-input border border-border bg-surface px-4 py-3 text-left">
          <p className="text-xs font-semibold text-ink-muted mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Looking for your school?
          </p>
          <p className="text-xs text-ink-muted">
            Your portal looks like <span className="font-mono">your-school.{BASE_DOMAIN}</span>.
            Contact your school office for the correct address.
          </p>
        </div>
      </div>
    </div>
  );
}
