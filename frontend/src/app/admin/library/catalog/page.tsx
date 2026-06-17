"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { getBooks, createBook, lookupIsbn } from "@/lib/api/library";
import { Plus, Search, BookMarked, DownloadCloud } from "lucide-react";

export default function CatalogPage() {
  const pathname = usePathname();

  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [form, setForm] = useState({
    title: "",
    author: "",
    publisher: "",
    isbn: "",
    edition: "",
    category: "General",
    total_copies: 1,
    location_rack: "",
  });

  const loadData = async (q?: string) => {
    setLoading(true);
    try {
      const res = await getBooks(q);
      setBooks(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(search);
  };

  const handleIsbnLookup = async () => {
    if (!form.isbn) return;
    setLookingUp(true);
    try {
      const res = await lookupIsbn(form.isbn);
      setForm((prev) => ({
        ...prev,
        title: res.data.title || prev.title,
        author: res.data.author || prev.author,
        publisher: res.data.publisher || prev.publisher,
      }));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Book not found in Open Library");
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await createBook(form);
      alert(res.message || "Book added to catalog successfully");
      setIsModalOpen(false);
      setForm({
        title: "",
        author: "",
        publisher: "",
        isbn: "",
        edition: "",
        category: "General",
        total_copies: 1,
        location_rack: "",
      });
      loadData(search);
    } catch (err: any) {
      alert("Failed to add book");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }: any) => <span className="font-bold text-ink">{row.original.title}</span>,
    },
    { accessorKey: "author", header: "Author" },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }: any) => (
        <span className="text-xs bg-surface px-2 py-1 rounded">{row.original.category}</span>
      ),
    },
    {
      accessorKey: "isbn",
      header: "ISBN",
      cell: ({ row }: any) => <span className="text-xs font-mono">{row.original.isbn || "-"}</span>,
    },
    {
      accessorKey: "location_rack",
      header: "Rack",
      cell: ({ row }: any) => (
        <span className="font-medium text-primary-700">{row.original.location_rack || "-"}</span>
      ),
    },
    {
      id: "availability",
      header: "Availability",
      cell: ({ row }: any) => {
        const avail = row.original.available_copies;
        const total = row.original.total_copies;
        const color = avail > 0 ? "text-green-600" : "text-red-600";
        return (
          <span className={`font-bold ${color}`}>
            {avail} / {total}
          </span>
        );
      },
    },
  ];

  return (
    <div className="pb-12">
      <div className="flex gap-4 border-b mb-6 pb-2">
        <Link
          href="/admin/library/catalog"
          className={`font-semibold ${pathname === "/admin/library/catalog" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Catalog
        </Link>
        <Link
          href="/admin/library/issues"
          className={`font-semibold ${pathname === "/admin/library/issues" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Issue / Return Desk
        </Link>
        <Link
          href="/admin/library/reports"
          className={`font-semibold ${pathname === "/admin/library/reports" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Library Reports
        </Link>
      </div>

      <PageHeader
        title="Library Catalog"
        description="Manage the school book inventory and track available copies."
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add New Book
          </button>
        }
      />

      <div className="bg-surface-card p-4 rounded-xl shadow-sm border border-border mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-ink-faint" />
            <input
              type="text"
              placeholder="Search by Title, Author, or ISBN..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="bg-gray-900 text-white px-6 py-2 rounded hover:bg-gray-800"
          >
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div className="py-12 text-center text-ink-muted">Loading catalog...</div>
      ) : (
        <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 bg-surface border-b flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-ink-muted" />
            <h3 className="font-bold text-ink">Inventory Records ({books.length})</h3>
          </div>
          <DataTable columns={columns} data={books} />
        </div>
      )}

      {/* Add Book Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-xl p-6 w-full max-w-2xl shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Add Book to Catalog</h2>

            {/* ISBN Lookup Helper */}
            <div className="mb-6 p-4 bg-primary-50 border border-primary-100 rounded-lg flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-ink mb-1 uppercase tracking-wider">
                  Fast Fill via ISBN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Enter ISBN-10 or ISBN-13"
                  className="w-full border-blue-300 rounded p-2 text-sm"
                  value={form.isbn}
                  onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={handleIsbnLookup}
                disabled={!form.isbn || lookingUp}
                className="bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1"
              >
                <DownloadCloud className="w-4 h-4" /> {lookingUp ? "Fetching..." : "Lookup"}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Book Title *</label>
                <input
                  required
                  type="text"
                  className="w-full border rounded p-2"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Author(s)</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2"
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Publisher</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2"
                    value={form.publisher}
                    onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    className="w-full border rounded p-2"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="General">General</option>
                    <option value="Fiction">Fiction</option>
                    <option value="Non-Fiction">Non-Fiction</option>
                    <option value="Science">Science</option>
                    <option value="History">History</option>
                    <option value="Reference">Reference</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Edition</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2"
                    value={form.edition}
                    onChange={(e) => setForm({ ...form, edition: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rack / Location</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2"
                    placeholder="e.g. A1-Shelve2"
                    value={form.location_rack}
                    onChange={(e) => setForm({ ...form, location_rack: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-2">
                <label className="block text-sm font-medium mb-1">Number of Copies to Add *</label>
                <input
                  required
                  type="number"
                  min="1"
                  className="w-32 border rounded p-2"
                  value={form.total_copies}
                  onChange={(e) => setForm({ ...form, total_copies: parseInt(e.target.value) })}
                />
                <p className="text-xs text-ink-muted mt-1">
                  If ISBN exists in catalog, copies will simply be incremented.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded font-medium text-ink-muted hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-gray-900 text-white rounded font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
