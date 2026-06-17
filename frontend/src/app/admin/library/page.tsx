"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubNav } from "@/components/ui/SubNav";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Library, BookOpen, BookX, Book, Plus, BookMarked } from "lucide-react";

const tabs = [
  { href: "/admin/library", label: "Overview" },
  { href: "/admin/library/catalog", label: "Catalog" },
  { href: "/admin/library/issues", label: "Issue Records" },
  { href: "/admin/library/reports", label: "Reports" },
];

export default function AdminLibraryPage() {
  const router = useRouter();
  const [books, setBooks] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [booksRes, issuesRes] = await Promise.all([
          api.get("/library/books"),
          api.get("/library/issues"),
        ]);
        setBooks(booksRes.data?.data || []);
        setIssues(issuesRes.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalCopies = books.reduce((a, b) => a + (b.total_copies || 0), 0);
  const available = books.reduce((a, b) => a + (b.available_copies || 0), 0);
  const overdue = issues.filter((i) => i.status === "Overdue").length;

  return (
    <div>
      <PageHeader
        title="Library Management"
        description="Manage the catalog, issue/return books, and track overdue items."
        action={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push("/admin/library/issues")}>
              <Plus size={16} /> Issue Book
            </Button>
            <Button onClick={() => router.push("/admin/library/catalog")}>
              <BookMarked size={16} /> Add Book
            </Button>
          </div>
        }
      />
      <SubNav items={tabs} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Copies"
          value={totalCopies}
          icon={<Library size={20} />}
          iconClassName="bg-primary-50 text-primary-600"
        />
        <StatCard
          title="Available"
          value={available}
          icon={<Book size={20} />}
          iconClassName="bg-success-bg text-success-text"
        />
        <StatCard
          title="Currently Issued"
          value={issues.filter((i) => i.status !== "Returned").length}
          icon={<BookOpen size={20} />}
          iconClassName="bg-warning-bg text-warning-text"
        />
        <StatCard
          title="Overdue"
          value={overdue}
          icon={<BookX size={20} />}
          iconClassName="bg-danger-bg text-danger-text"
        />
      </div>

      <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-base font-semibold text-ink">Catalog</h2>
        </div>
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : books.length === 0 ? (
          <EmptyState
            icon={<Library size={22} />}
            title="No books yet"
            description="Add books to the catalog to get started."
            action={
              <Button onClick={() => router.push("/admin/library/catalog")}>
                <BookMarked size={16} /> Add Book
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Book", "Category", "ISBN", "Total", "Available"].map((h) => (
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
                {books.map((b) => (
                  <tr key={b.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-ink">{b.title}</p>
                      <p className="text-xs text-ink-faint">{b.author}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{b.category || "—"}</td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{b.isbn || "—"}</td>
                    <td className="px-4 py-3 text-sm text-ink">{b.total_copies}</td>
                    <td className="px-4 py-3">
                      <Badge variant={b.available_copies > 0 ? "success" : "danger"}>
                        {b.available_copies}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
