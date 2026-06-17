"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { getBooks, issueBook, getIssues, returnBook } from "@/lib/api/library";
import { getStudents, Student } from "@/lib/api/students";
import { Search, CornerDownRight, Undo2, AlertTriangle } from "lucide-react";

export default function IssueReturnDeskPage() {
  const pathname = usePathname();

  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Issue Mode Context
  const [isIssueMode, setIsIssueMode] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [books, setBooks] = useState<any[]>([]);

  // Issue Form State
  const [searchStudent, setSearchStudent] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [searchBook, setSearchBook] = useState("");
  const [selectedBook, setSelectedBook] = useState<any>(null);

  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // Default 14 days
    return d.toISOString().split("T")[0];
  });
  const [issuing, setAssigning] = useState(false);

  const loadIssues = async () => {
    setLoading(true);
    try {
      // Load current active issues (Issued or Overdue)
      const res1 = await getIssues("Issued");
      const res2 = await getIssues("Overdue");
      // Merge unique
      const merged = [...(res1.data || []), ...(res2.data || [])];
      // Basic unique filter in case of overlap in demo
      const unique = Array.from(new Map(merged.map((item) => [item.id, item])).values());
      setIssues(unique);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
    // Pre-load lookup data for fast UX
    Promise.all([getStudents(), getBooks()]).then(([sRes, bRes]) => {
      setStudents(sRes.data || []);
      setBooks(bRes.data || []);
    });
  }, []);

  const handleIssue = async () => {
    if (!selectedStudent || !selectedBook) return;
    setAssigning(true);
    try {
      const res = await issueBook({
        book_id: selectedBook.id,
        student_id: selectedStudent.id,
        due_date: dueDate,
      });
      alert(res.message);
      setIsIssueMode(false);
      setSelectedStudent(null);
      setSelectedBook(null);
      setSearchStudent("");
      setSearchBook("");
      loadIssues();
      // Reload books to update available count
      const bRes = await getBooks();
      setBooks(bRes.data || []);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to issue book");
    } finally {
      setAssigning(false);
    }
  };

  const handleReturn = async (issueId: string) => {
    if (!confirm("Confirm returning this book?")) return;
    try {
      const res = await returnBook(issueId);
      alert(res.message);
      loadIssues();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to return book");
    }
  };

  const filteredStudents =
    searchStudent.length > 2
      ? students
          .filter((s) =>
            `${s.first_name} ${s.last_name} ${s.admission_number}`
              .toLowerCase()
              .includes(searchStudent.toLowerCase())
          )
          .slice(0, 5)
      : [];

  const filteredBooks =
    searchBook.length > 2
      ? books
          .filter(
            (b) =>
              `${b.title} ${b.isbn}`.toLowerCase().includes(searchBook.toLowerCase()) &&
              b.available_copies > 0
          )
          .slice(0, 5)
      : [];

  const columns = [
    {
      accessorKey: "book_title",
      header: "Book Title",
      cell: ({ row }: any) => <span className="font-bold text-ink">{row.original.book_title}</span>,
    },
    { accessorKey: "borrower_name", header: "Borrower" },
    { accessorKey: "issue_date", header: "Issued On" },
    {
      accessorKey: "due_date",
      header: "Due Date",
      cell: ({ row }: any) => {
        const isOverdue = row.original.status === "Overdue";
        return (
          <span className={`font-medium ${isOverdue ? "text-red-600" : "text-ink"}`}>
            {row.original.due_date}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const s = row.original.status;
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-bold ${s === "Overdue" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
          >
            {s}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <button
          onClick={() => handleReturn(row.original.id)}
          className="bg-surface-card border border-border-strong text-ink px-3 py-1 rounded text-xs font-medium hover:bg-surface flex items-center gap-1 shadow-sm"
        >
          <Undo2 className="w-3 h-3" /> Return
        </button>
      ),
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
        title="Issue & Return Desk"
        description="Process library checkouts and returns. Fines are calculated automatically upon return if overdue."
        action={
          !isIssueMode ? (
            <button
              onClick={() => setIsIssueMode(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium flex items-center gap-2 shadow-sm"
            >
              <CornerDownRight className="w-4 h-4" /> Issue Book
            </button>
          ) : (
            <button
              onClick={() => setIsIssueMode(false)}
              className="bg-surface text-ink px-4 py-2 rounded-md hover:bg-border font-medium shadow-sm"
            >
              Cancel Issue
            </button>
          )
        }
      />

      {isIssueMode && (
        <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-primary-100 mb-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Step 1: Student Lookup */}
          <div className="relative border-r pr-8">
            <h3 className="font-bold text-lg mb-4 text-ink">1. Identify Borrower</h3>
            {!selectedStudent ? (
              <div>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-2.5 text-ink-faint" />
                  <input
                    type="text"
                    placeholder="Search Student by Name or Adm No..."
                    className="w-full pl-10 pr-4 py-2 border rounded-md"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                  />
                </div>
                {filteredStudents.length > 0 && (
                  <div className="absolute z-10 w-[calc(100%-2rem)] mt-1 bg-surface-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredStudents.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => {
                          setSelectedStudent(st);
                          setSearchStudent("");
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-primary-50 text-sm border-b last:border-0"
                      >
                        <div className="font-bold">
                          {st.first_name} {st.last_name}
                        </div>
                        <div className="text-ink-muted text-xs">Adm: {st.admission_number}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-primary-50 p-4 rounded-lg border border-primary-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-ink">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </p>
                  <p className="text-sm text-primary-700">
                    Adm No: {selectedStudent.admission_number}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-xs font-medium text-primary-600 hover:underline"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Book Lookup */}
          <div className="relative">
            <h3 className="font-bold text-lg mb-4 text-ink">2. Select Book</h3>
            {!selectedBook ? (
              <div>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-2.5 text-ink-faint" />
                  <input
                    type="text"
                    placeholder="Search Book by Title or ISBN (Available copies only)..."
                    className="w-full pl-10 pr-4 py-2 border rounded-md"
                    value={searchBook}
                    onChange={(e) => setSearchBook(e.target.value)}
                  />
                </div>
                {filteredBooks.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-surface-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredBooks.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setSelectedBook(b);
                          setSearchBook("");
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-surface text-sm border-b last:border-0"
                      >
                        <div className="font-bold text-ink">{b.title}</div>
                        <div className="text-ink-muted text-xs flex justify-between">
                          <span>ISBN: {b.isbn || "N/A"}</span>
                          <span className="text-green-600 font-bold">
                            {b.available_copies} Available
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-surface p-4 rounded-lg border border-border flex justify-between items-center">
                  <div>
                    <p className="font-bold text-ink">{selectedBook.title}</p>
                    <p className="text-sm text-ink-muted">ISBN: {selectedBook.isbn || "N/A"}</p>
                  </div>
                  <button
                    onClick={() => setSelectedBook(null)}
                    className="text-xs font-medium text-ink-muted hover:underline"
                  >
                    Change
                  </button>
                </div>

                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Return Due Date</label>
                    <input
                      type="date"
                      className="w-full border rounded p-2"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleIssue}
                    disabled={!selectedStudent || issuing}
                    className="bg-gray-900 text-white px-6 py-2 rounded font-bold hover:bg-gray-800 disabled:opacity-50 h-10"
                  >
                    {issuing ? "Processing..." : "Confirm Checkout"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-ink-muted">Loading current issues...</div>
      ) : (
        <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 bg-surface border-b flex justify-between items-center">
            <h3 className="font-bold text-ink">Currently Issued Books ({issues.length})</h3>
            <div className="flex items-center gap-2 text-xs text-red-600 font-medium">
              <AlertTriangle className="w-4 h-4" />
              {issues.filter((i) => i.status === "Overdue").length} Overdue
            </div>
          </div>
          <DataTable columns={columns} data={issues} />
        </div>
      )}
    </div>
  );
}
