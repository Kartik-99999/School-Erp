"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getStaffProfile,
  getSalaryStructure,
  createSalaryStructure,
  getPayslipUrl,
} from "@/lib/api/staff";
import { User, Phone, Briefcase, Download, Wallet, AlertCircle } from "lucide-react";
import api from "@/lib/axios";

export default function StaffProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [salary, setSalary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Salary Form
  const [isSalaryFormOpen, setIsSalaryFormOpen] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    basic_salary: 0,
    hra: 0,
    da: 0,
    allowances: "{}",
    deductions: '{"PF": 0, "TDS": 0}',
  });

  // Payslip form
  const [payslipMonth, setPayslipMonth] = useState("");

  const [photoUploading, setPhotoUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoUploading(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await api.post(`/staff/${id}/photo`, form);
      setProfile((p: any) => ({ ...p, photo_url: res.data.data.photo_url }));
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to upload photo");
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  const fetchData = async () => {
    try {
      const [profRes, salRes] = await Promise.allSettled([
        getStaffProfile(id),
        getSalaryStructure(id),
      ]);
      if (profRes.status === "fulfilled") setProfile(profRes.value.data);
      if (salRes.status === "fulfilled") setSalary(salRes.value.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSalarySave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        staff_id: id,
        basic_salary: salaryForm.basic_salary,
        hra: salaryForm.hra,
        da: salaryForm.da,
        allowances: JSON.parse(salaryForm.allowances),
        deductions: JSON.parse(salaryForm.deductions),
      };
      await createSalaryStructure(payload);
      alert("Salary structure saved!");
      setIsSalaryFormOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save salary structure. (Ensure valid JSON)");
    }
  };

  if (loading) return <div className="p-8 text-center text-ink-muted">Loading Profile...</div>;
  if (!profile) return <div className="p-8 text-center text-red-500">Profile not found.</div>;

  return (
    <div className="pb-12">
      <PageHeader title="Staff Profile" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - ID Card */}
        <div className="col-span-1 space-y-6">
          <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border text-center">
            <label
              className="relative w-24 h-24 bg-surface text-ink-muted rounded-full mx-auto flex items-center justify-center mb-4 overflow-hidden cursor-pointer group"
              title="Click to change photo"
            >
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="Staff" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12" />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold text-center px-1">
                {photoUploading ? "Uploading…" : "Change"}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={photoUploading}
              />
            </label>
            <h2 className="text-2xl font-bold">
              {profile.first_name} {profile.last_name}
            </h2>
            <p className="text-primary-600 font-medium mt-1">
              {profile.designation || "No Designation"}
            </p>
            <div className="mt-4 border-t pt-4 grid grid-cols-1 gap-2 text-left">
              <p className="text-sm">
                <span className="text-ink-muted inline-block w-24">EMP ID:</span>{" "}
                <strong>{profile.employee_id}</strong>
              </p>
              <p className="text-sm">
                <span className="text-ink-muted inline-block w-24">Department:</span>{" "}
                <strong>{profile.department || "-"}</strong>
              </p>
              <p className="text-sm">
                <span className="text-ink-muted inline-block w-24">Phone:</span>{" "}
                <strong>{profile.phone}</strong>
              </p>
              <p className="text-sm">
                <span className="text-ink-muted inline-block w-24">Joined:</span>{" "}
                <strong>{profile.date_of_joining || "-"}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Payroll & Leaves */}
        <div className="col-span-2 space-y-6">
          <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5" /> Payroll & Salary
              </h3>
              {!salary && !isSalaryFormOpen && (
                <button
                  onClick={() => setIsSalaryFormOpen(true)}
                  className="text-sm bg-primary-50 text-primary-600 px-3 py-1 rounded hover:bg-primary-50 font-medium"
                >
                  Setup Salary Structure
                </button>
              )}
            </div>

            {isSalaryFormOpen ? (
              <form
                onSubmit={handleSalarySave}
                className="space-y-4 bg-surface p-4 rounded-lg border"
              >
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Basic Salary (₹)</label>
                    <input
                      type="number"
                      required
                      className="w-full border rounded p-2 text-sm"
                      value={salaryForm.basic_salary}
                      onChange={(e) =>
                        setSalaryForm({ ...salaryForm, basic_salary: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">HRA (₹)</label>
                    <input
                      type="number"
                      required
                      className="w-full border rounded p-2 text-sm"
                      value={salaryForm.hra}
                      onChange={(e) =>
                        setSalaryForm({ ...salaryForm, hra: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">DA (₹)</label>
                    <input
                      type="number"
                      required
                      className="w-full border rounded p-2 text-sm"
                      value={salaryForm.da}
                      onChange={(e) => setSalaryForm({ ...salaryForm, da: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Allowances (JSON)</label>
                    <textarea
                      className="w-full border rounded p-2 text-sm font-mono h-20"
                      value={salaryForm.allowances}
                      onChange={(e) => setSalaryForm({ ...salaryForm, allowances: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Deductions (JSON)</label>
                    <textarea
                      className="w-full border rounded p-2 text-sm font-mono h-20"
                      value={salaryForm.deductions}
                      onChange={(e) => setSalaryForm({ ...salaryForm, deductions: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSalaryFormOpen(false)}
                    className="text-sm px-4 py-2 border rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-sm px-4 py-2 bg-primary-600 text-white rounded"
                  >
                    Save Structure
                  </button>
                </div>
              </form>
            ) : salary ? (
              <div>
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div>
                    <h4 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-2">
                      Earnings
                    </h4>
                    <ul className="space-y-1 text-sm">
                      <li className="flex justify-between">
                        <span>Basic</span> <strong>₹{salary.basic_salary}</strong>
                      </li>
                      <li className="flex justify-between">
                        <span>HRA</span> <strong>₹{salary.hra}</strong>
                      </li>
                      <li className="flex justify-between">
                        <span>DA</span> <strong>₹{salary.da}</strong>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-2">
                      Deductions
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {Object.entries(salary.deductions || {}).map(([key, val]: any) => (
                        <li key={key} className="flex justify-between">
                          <span>{key}</span> <strong className="text-red-600">-₹{val}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-primary-50 border border-primary-100 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-ink">Generate Payslip (PDF)</h4>
                    <p className="text-xs text-primary-700">Select month and year to download.</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="month"
                      className="border-primary-100 rounded text-sm px-2"
                      value={payslipMonth}
                      onChange={(e) => setPayslipMonth(e.target.value)}
                    />
                    <a
                      href={
                        payslipMonth
                          ? getPayslipUrl(
                              id,
                              payslipMonth.split("-")[1],
                              payslipMonth.split("-")[0]
                            )
                          : "#"
                      }
                      target="_blank"
                      className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${!payslipMonth ? "bg-surface text-ink-faint pointer-events-none" : "bg-primary-600 text-white hover:bg-primary-700"}`}
                    >
                      <Download className="w-4 h-4" /> Download
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 bg-surface rounded-lg text-ink-muted border border-dashed flex flex-col items-center">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                No salary structure configured for this employee.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
