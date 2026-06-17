"use client";
import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import { CreditCard, Download, Clock, CheckCircle } from "lucide-react";

export default function ParentFeesPage() {
  const [dues, setDues] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeesData = async () => {
      try {
        const [duesRes, receiptsRes] = await Promise.all([
          api.get("/fees/dues"),
          api.get("/fees/receipts"),
        ]);

        if (duesRes.data.success) {
          setDues(duesRes.data.data);
        }
        if (receiptsRes.data.success) {
          setReceipts(receiptsRes.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch fees", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeesData();
  }, []);

  const handlePay = async (due: any) => {
    alert("Payment gateway simulation initiated for amount: ₹" + due.net_amount);
    // In real app, we would call /fees/payments/online/initiate
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12">
      <div>
        <h2 className="text-2xl font-bold text-ink">Fee Tracking & Payments</h2>
        <p className="text-ink-muted mt-1">Manage your pending dues and view payment history.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Dues Section */}
        <div className="bg-surface-card rounded-card border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between bg-surface">
            <h3 className="font-bold text-lg text-ink flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Pending Dues
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {loading ? (
              <p className="text-ink-muted">Loading dues...</p>
            ) : dues.filter((d) => d.status !== "Paid").length > 0 ? (
              dues
                .filter((d) => d.status !== "Paid")
                .map((due) => (
                  <div
                    key={due.id}
                    className="border border-border rounded-card p-4 flex flex-col gap-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-ink">Fee Installment</h4>
                        <p className="text-sm text-ink-muted">
                          Due Date: {new Date(due.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                        {due.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-border pt-4 mt-2">
                      <span className="text-xl font-bold text-ink">₹{due.net_amount}</span>
                      <button
                        onClick={() => handlePay(due)}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-6 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" /> Pay Now
                      </button>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="font-medium text-ink">All caught up!</p>
                <p className="text-sm text-ink-muted">You have no pending dues.</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment History Section */}
        <div className="bg-surface-card rounded-card border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between bg-surface">
            <h3 className="font-bold text-lg text-ink flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" /> Payment History
            </h3>
          </div>
          <div className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface border-b border-border text-ink-muted">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Receipt No</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-ink-muted">
                        Loading...
                      </td>
                    </tr>
                  ) : receipts.length > 0 ? (
                    receipts.map((receipt) => (
                      <tr key={receipt.id} className="hover:bg-surface transition-colors">
                        <td className="px-6 py-4 font-medium text-ink">{receipt.receipt_number}</td>
                        <td className="px-6 py-4 text-ink-muted">
                          {new Date(receipt.payment_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-medium text-ink">₹{receipt.total_amount}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() =>
                              window.open(
                                `http://localhost:8000/api/v1/fees/receipts/${receipt.id}/pdf`,
                                "_blank"
                              )
                            }
                            className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1 bg-primary-50 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" /> PDF
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-ink-muted">
                        No payment history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
