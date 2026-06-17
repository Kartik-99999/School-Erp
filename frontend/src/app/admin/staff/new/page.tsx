"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createStaff } from "@/lib/api/staff";
import { Copy } from "lucide-react";

export default function NewStaffPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role_name: "Teacher",
    designation: "",
    department: "",
    phone: "",
    date_of_joining: "",
    gender: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createStaff(formData);
      setSuccessData(res);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add staff");
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-surface-card p-8 rounded-xl shadow-sm border border-green-100 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-ink mb-2">Staff Created Successfully!</h2>
        <p className="text-ink-muted mb-6">
          The portal account has been generated. Please share these credentials securely with the
          staff member.
        </p>

        <div className="bg-surface border border-border rounded-lg p-6 text-left max-w-md mx-auto relative group">
          <div className="space-y-3">
            <p>
              <span className="text-ink-muted w-24 inline-block">Name:</span>{" "}
              <strong>
                {successData.data.first_name} {successData.data.last_name}
              </strong>
            </p>
            <p>
              <span className="text-ink-muted w-24 inline-block">Email:</span>{" "}
              <strong>{formData.email}</strong>
            </p>
            <p>
              <span className="text-ink-muted w-24 inline-block">Password:</span>{" "}
              <strong>{successData.message.split("Temp Password: ")[1]}</strong>
            </p>
            <p>
              <span className="text-ink-muted w-24 inline-block">Portal URL:</span>{" "}
              <strong>https://school.com/login</strong>
            </p>
          </div>
          <button
            onClick={() => {
              const pw = successData.message.split("Temp Password: ")[1];
              navigator.clipboard.writeText(
                `Email: ${formData.email}\nPassword: ${pw}\nURL: https://school.com/login`
              );
              alert("Copied to clipboard!");
            }}
            className="absolute top-4 right-4 text-ink-faint hover:text-primary-600 flex flex-col items-center"
          >
            <Copy className="w-5 h-5" />
            <span className="text-[10px] mt-1">Copy</span>
          </button>
        </div>

        <button
          onClick={() => router.push("/admin/staff")}
          className="mt-8 bg-gray-900 text-white px-6 py-2 rounded-md hover:bg-gray-800"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="pb-12 max-w-4xl mx-auto">
      <PageHeader
        title="Add Staff Member"
        description="Register a new employee and generate their portal access."
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-8 bg-surface-card p-8 rounded-xl shadow-sm border border-border"
      >
        <div>
          <h3 className="text-lg font-semibold text-ink border-b pb-2 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input
                required
                type="text"
                className="w-full border rounded p-2"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <input
                required
                type="text"
                className="w-full border rounded p-2"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email (For Login) *</label>
              <input
                required
                type="email"
                className="w-full border rounded p-2"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number *</label>
              <input
                required
                type="tel"
                className="w-full border rounded p-2"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gender</label>
              <select
                className="w-full border rounded p-2"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-ink border-b pb-2 mb-4">Employment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">System Role *</label>
              <select
                required
                className="w-full border rounded p-2 bg-primary-50"
                value={formData.role_name}
                onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
              >
                <option value="Teacher">Teacher</option>
                <option value="Accountant">Accountant</option>
                <option value="School Admin">School Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date of Joining</label>
              <input
                type="date"
                className="w-full border rounded p-2"
                value={formData.date_of_joining}
                onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Designation</label>
              <input
                type="text"
                className="w-full border rounded p-2"
                placeholder="e.g. Senior Science Teacher"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select
                className="w-full border rounded p-2"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <option value="">Select</option>
                <option value="Science">Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Languages">Languages</option>
                <option value="Administration">Administration</option>
                <option value="Support">Support</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded font-medium text-ink hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 bg-primary-600 text-white rounded font-medium hover:bg-primary-700 ${loading ? "opacity-50" : ""}`}
          >
            {loading ? "Processing..." : "Create Staff Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
