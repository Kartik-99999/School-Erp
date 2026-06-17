"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createSchool } from "@/lib/api/superAdmin";

export default function NewSchoolPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    subdomain: "",
    address: "",
    contact_email: "",
    contact_phone: "",
    board_affiliation: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createSchool(formData);
      if (res && res.message) {
        setSuccessMessage(res.message);
      } else {
        router.push("/super-admin/schools");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to create school. Subdomain might be taken.");
    } finally {
      setLoading(false);
    }
  };

  if (successMessage) {
    return (
      <div className="max-w-2xl mx-auto pb-12">
        <PageHeader
          title="School Created Successfully"
          description="Please save these credentials."
        />
        <div className="bg-green-50 rounded-xl shadow-sm border border-green-200 p-6 mt-6">
          <h3 className="text-lg font-bold text-green-900 mb-2">Onboarding Complete</h3>
          <p className="text-green-800 mb-6 font-medium whitespace-pre-wrap">{successMessage}</p>
          <div className="flex justify-end">
            <button
              onClick={() => router.push("/super-admin/schools")}
              className="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
            >
              Continue to Schools
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <PageHeader
        title="Register New School"
        description="Create a new tenant workspace for a school."
      />

      <div className="bg-surface-card rounded-xl shadow-sm border border-border p-6 mt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">School Name *</label>
              <input
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2 border border-border-strong rounded-md focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. Springfield High"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">Subdomain *</label>
              <input
                required
                name="subdomain"
                value={formData.subdomain}
                onChange={handleChange}
                className="w-full p-2 border border-border-strong rounded-md focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. springfield"
              />
              <p className="text-xs text-ink-muted">
                Will be used for tenant login: {formData.subdomain || "subdomain"}.educore.com
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">Contact Email</label>
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                className="w-full p-2 border border-border-strong rounded-md focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">Contact Phone</label>
              <input
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                className="w-full p-2 border border-border-strong rounded-md focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-ink">Address</label>
              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full p-2 border border-border-strong rounded-md focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-ink">Board Affiliation</label>
              <input
                name="board_affiliation"
                value={formData.board_affiliation}
                onChange={handleChange}
                className="w-full p-2 border border-border-strong rounded-md focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. CBSE, ICSE, State Board"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-ink-muted hover:bg-surface rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create School"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
