"use client";
import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getStudents, Student } from "@/lib/api/students";
import { getDues, recordOfflinePayment } from "@/lib/api/fees";
import { getFeeStructures, getFeeHeads } from "@/lib/api/setup";
import { Search, IndianRupee, CreditCard, Banknote } from "lucide-react";

function CollectPaymentInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const prefillStudent = searchParams.get("student_id");

  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [structures, setStructures] = useState<any[]>([]);
  const [heads, setHeads] = useState<any[]>([]);
  const [pendingDues, setPendingDues] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Payment Form
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [transactionRef, setTransactionRef] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    Promise.all([getStudents(), getFeeStructures(), getFeeHeads()]).then(
      ([stRes, fsRes, fhRes]) => {
        setStudents(stRes.data || []);
        setStructures(fsRes.data || []);
        setHeads(fhRes.data || []);

        if (prefillStudent && stRes.data) {
          const target = stRes.data.find((s: any) => s.id === prefillStudent);
          if (target) selectStudent(target);
        }
      }
    );
  }, []);

  const selectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery("");
    setLoading(true);
    setAllocations({});
    try {
      // Fetch only pending/partial dues
      const res1 = await getDues({ student_id: student.id, status: "Pending" });
      const res2 = await getDues({ student_id: student.id, status: "Partial" });
      const allPending = [...(res1.data || []), ...(res2.data || [])];
      setPendingDues(allPending);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getHeadName = (structId: string) => {
    const s = structures.find((x) => x.id === structId);
    if (!s) return "Unknown";
    const h = heads.find((x) => x.id === s.fee_head_id);
    return h ? h.name : "Unknown";
  };

  const handleAllocationChange = (dueId: string, amount: string, maxAllowable: number) => {
    let val = parseFloat(amount) || 0;
    if (val > maxAllowable) val = maxAllowable;
    if (val < 0) val = 0;

    setAllocations((prev) => {
      const newAlloc = { ...prev };
      if (val === 0) {
        delete newAlloc[dueId];
      } else {
        newAlloc[dueId] = val;
      }
      return newAlloc;
    });
  };

  const totalPayment = Object.values(allocations).reduce((sum, val) => sum + val, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || totalPayment <= 0) return;
    setProcessing(true);
    try {
      const allocArray = Object.entries(allocations).map(([fee_schedule_id, amount]) => ({
        fee_schedule_id,
        amount,
      }));

      const payload = {
        student_id: selectedStudent.id,
        payment_mode: paymentMode,
        transaction_reference: transactionRef || undefined,
        remarks: remarks || undefined,
        allocations: allocArray,
      };

      await recordOfflinePayment(payload);
      alert("Payment recorded successfully! SMS/WhatsApp Receipt sent.");
      router.push("/accountant/fees/reports");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to process payment");
    } finally {
      setProcessing(false);
    }
  };

  const filteredStudents =
    searchQuery.length > 2
      ? students
          .filter((s) =>
            `${s.first_name} ${s.last_name} ${s.admission_number}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          )
          .slice(0, 5)
      : [];

  return (
    <div className="pb-12">
      <div className="flex gap-4 border-b mb-6 pb-2">
        <Link
          href="/accountant/fees/dues"
          className={`font-semibold ${pathname === "/accountant/fees/dues" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Fee Dues
        </Link>
        <Link
          href="/accountant/fees/payments"
          className={`font-semibold ${pathname === "/accountant/fees/payments" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Collect Payment
        </Link>
        <Link
          href="/accountant/fees/reports"
          className={`font-semibold ${pathname === "/accountant/fees/reports" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Transactions & Receipts
        </Link>
      </div>

      <PageHeader
        title="Fee Collection Terminal"
        description="Process offline payments (Cash, Cheque, UPI) and allocate them against outstanding dues."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Search & Student Profile */}
        <div className="col-span-1 space-y-6">
          <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border relative">
            <label className="block text-sm font-medium mb-2">Search Student</label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-2.5 text-ink-faint" />
              <input
                type="text"
                placeholder="Name or Adm No..."
                className="w-full pl-10 pr-4 py-2 border rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {filteredStudents.length > 0 && (
              <div className="absolute z-10 w-full left-0 mt-1 bg-surface-card border rounded-md shadow-lg">
                {filteredStudents.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => selectStudent(st)}
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

          {selectedStudent && (
            <div className="bg-blue-900 text-white p-6 rounded-xl shadow-sm border border-blue-800">
              <h3 className="text-xl font-bold mb-1">
                {selectedStudent.first_name} {selectedStudent.last_name}
              </h3>
              <p className="text-blue-200 text-sm mb-4">
                Adm No: {selectedStudent.admission_number}
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm mt-4 border-t border-blue-800 pt-4">
                <div>
                  <p className="text-blue-300">Status</p>
                  <p className="font-medium text-green-400">Active</p>
                </div>
                <div>
                  <p className="text-blue-300">Total Pending Dues</p>
                  <p className="font-bold text-lg">
                    ₹
                    {pendingDues.reduce(
                      (sum, d) => sum + (parseFloat(d.net_due_amount) - parseFloat(d.amount_paid)),
                      0
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Dues Allocation & Payment */}
        <div className="col-span-2">
          {!selectedStudent ? (
            <div className="h-full flex items-center justify-center bg-surface rounded-xl border border-dashed text-ink-faint">
              Select a student to view dues and process payment.
            </div>
          ) : loading ? (
            <div className="p-12 text-center text-ink-muted">Loading dues...</div>
          ) : (
            <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="p-4 bg-surface border-b">
                <h3 className="font-bold text-ink">Allocate Payment against Dues</h3>
              </div>

              <div className="p-4">
                {pendingDues.length === 0 ? (
                  <p className="text-center text-green-600 font-bold py-8">
                    No outstanding dues! Student ledger is clear.
                  </p>
                ) : (
                  <table className="w-full text-sm text-left mb-6">
                    <thead className="bg-surface border-b">
                      <tr>
                        <th className="p-2">Fee Head</th>
                        <th className="p-2">Due Date</th>
                        <th className="p-2 text-right">Balance Due (₹)</th>
                        <th className="p-2 w-32">Paying Now (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingDues.map((d) => {
                        const balance = parseFloat(d.net_due_amount) - parseFloat(d.amount_paid);
                        return (
                          <tr key={d.id} className="border-b">
                            <td className="p-2 font-medium">{getHeadName(d.fee_structure_id)}</td>
                            <td className="p-2">{d.due_date}</td>
                            <td className="p-2 text-right font-bold text-red-600">{balance}</td>
                            <td className="p-2">
                              <input
                                type="number"
                                className="w-full border rounded p-1 text-right focus:ring-primary-500 focus:border-primary-500"
                                placeholder="0.00"
                                max={balance}
                                min={0}
                                value={allocations[d.id] || ""}
                                onChange={(e) =>
                                  handleAllocationChange(d.id, e.target.value, balance)
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-surface font-bold">
                        <td colSpan={3} className="p-3 text-right text-lg">
                          Total Payment Amount:
                        </td>
                        <td className="p-3 text-xl text-green-700">₹{totalPayment}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {totalPayment > 0 && (
                  <form onSubmit={handleSubmit} className="border-t pt-6">
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" /> Payment Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Payment Mode</label>
                        <select
                          className="w-full border rounded p-2"
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                        >
                          <option value="Cash">Cash</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Demand Draft">Demand Draft</option>
                          <option value="UPI / Bank Transfer">UPI / Bank Transfer</option>
                        </select>
                      </div>
                      {paymentMode !== "Cash" && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Reference / Cheque No.
                          </label>
                          <input
                            required
                            type="text"
                            className="w-full border rounded p-2"
                            value={transactionRef}
                            onChange={(e) => setTransactionRef(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-1">Remarks (Optional)</label>
                      <input
                        type="text"
                        className="w-full border rounded p-2"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={processing}
                      className="w-full bg-green-600 text-white p-3 rounded-lg font-bold text-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                    >
                      <Banknote className="w-6 h-6" />
                      {processing ? "Processing..." : `Confirm Payment of ₹${totalPayment}`}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CollectPaymentPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-ink-muted">Loading terminal...</div>}>
      <CollectPaymentInner />
    </Suspense>
  );
}
