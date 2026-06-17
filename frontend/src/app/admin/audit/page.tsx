"use client";
import React, { useCallback, useEffect, useState } from "react";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ShieldCheck, Search } from "lucide-react";

interface AuditRow {
  id: string;
  actor_email?: string | null;
  actor_role?: string | null;
  action: string;
  entity_type?: string | null;
  summary?: string | null;
  ip_address?: string | null;
  created_at: string;
}

const PAGE_SIZE = 25;

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async (nextSkip: number, actionFilter: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ skip: String(nextSkip), limit: String(PAGE_SIZE) });
      if (actionFilter.trim()) params.set("action", actionFilter.trim());
      const res = await api.get(`/audit?${params.toString()}`);
      const page = res.data?.data ?? {};
      setRows(page.items || []);
      setTotal(page.total || 0);
      setSkip(page.skip ?? nextSkip);
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(0, "");
  }, [fetchLogs]);

  // Debounce the action filter.
  useEffect(() => {
    const t = setTimeout(() => fetchLogs(0, action), 350);
    return () => clearTimeout(t);
  }, [action, fetchLogs]);

  const page = Math.floor(skip / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="An append-only trail of sensitive actions across your school."
      />

      <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Input
              placeholder="Filter by action (e.g. fee.payment.recorded)…"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-sm text-ink-muted">
            {total} event{total === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={22} />}
            title="No audit events"
            description="Sensitive actions (logins, payments, conversions, deletions) will appear here as they happen."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["When", "Actor", "Action", "Details", "IP"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface transition-colors align-top">
                    <td className="px-4 py-3 text-sm text-ink-muted whitespace-nowrap">
                      {fmt(r.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink">
                      {r.actor_email || "—"}
                      {r.actor_role && (
                        <span className="block text-xs text-ink-faint">{r.actor_role}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{r.action}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink max-w-md">{r.summary || "—"}</td>
                    <td className="px-4 py-3 text-sm text-ink-faint whitespace-nowrap">
                      {r.ip_address || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <span className="text-sm text-ink-muted">
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={skip === 0}
                onClick={() => fetchLogs(Math.max(0, skip - PAGE_SIZE), action)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => fetchLogs(skip + PAGE_SIZE, action)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
