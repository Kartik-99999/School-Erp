"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { UserPlus, CheckCircle, Clock, XCircle, Search, Filter, X } from "lucide-react";

export default function AdminAdmissionsPage() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showNewModal, setShowNewModal] = useState(false);
  const [reviewEnquiry, setReviewEnquiry] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    student_name: "",
    parent_name: "",
    contact_number: "",
    email: "",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const res = await api.get("/enquiries");
      setEnquiries(res.data.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load admissions pipeline");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/enquiries", formData);
      setShowNewModal(false);
      setFormData({ student_name: "", parent_name: "", contact_number: "", email: "", notes: "" });
      fetchEnquiries();
    } catch (err) {
      console.error(err);
      alert("Failed to create enquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStage = async (id: string, stage: string) => {
    try {
      const form = new FormData();
      form.append("stage", stage);
      await api.put(`/enquiries/${id}/stage`, form);
      fetchEnquiries();
      if (reviewEnquiry) setReviewEnquiry(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update stage");
    }
  };

  const handleConvertToStudent = async (id: string) => {
    try {
      await api.post(`/enquiries/${id}/convert`);
      fetchEnquiries();
      if (reviewEnquiry) setReviewEnquiry(null);
      alert("Converted to student successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to convert to student");
    }
  };

  const pendingCount = enquiries.filter(e => e.stage === 'New' || e.stage === 'Under Review').length;
  const approvedCount = enquiries.filter(e => e.stage === 'Admitted').length;
  const rejectedCount = enquiries.filter(e => e.stage === 'Rejected').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      {/* Modals */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">New Application</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Student Name</label>
                <input required type="text" value={formData.student_name} onChange={e => setFormData({...formData, student_name: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Parent Name</label>
                <input required type="text" value={formData.parent_name} onChange={e => setFormData({...formData, parent_name: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                <input required type="text" value={formData.contact_number} onChange={e => setFormData({...formData, contact_number: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email (Optional)</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 h-24" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowNewModal(false)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {submitting ? "Saving..." : "Create Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Review Application</h3>
              <button onClick={() => setReviewEnquiry(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 font-medium">Student Name</p>
                  <p className="font-bold text-slate-800">{reviewEnquiry.student_name}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Parent Name</p>
                  <p className="font-bold text-slate-800">{reviewEnquiry.parent_name}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Contact Number</p>
                  <p className="font-bold text-slate-800">{reviewEnquiry.contact_number}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Email</p>
                  <p className="font-bold text-slate-800">{reviewEnquiry.email || "N/A"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 font-medium">Current Stage</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-1
                    ${reviewEnquiry.stage === 'Admitted' ? 'text-emerald-600 bg-emerald-50' : 
                      reviewEnquiry.stage === 'Rejected' ? 'text-red-600 bg-red-50' : 
                      'text-amber-600 bg-amber-50'}
                  `}>
                    {reviewEnquiry.stage}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-3">
                <p className="text-sm font-bold text-slate-800">Actions</p>
                <div className="flex flex-wrap gap-3">
                  {reviewEnquiry.stage !== 'Admitted' && (
                    <button onClick={() => handleConvertToStudent(reviewEnquiry.id)} className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Convert to Student
                    </button>
                  )}
                  {reviewEnquiry.stage !== 'Under Review' && reviewEnquiry.stage !== 'Admitted' && (
                    <button onClick={() => handleUpdateStage(reviewEnquiry.id, 'Under Review')} className="px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors">
                      Mark as Under Review
                    </button>
                  )}
                  {reviewEnquiry.stage !== 'Rejected' && reviewEnquiry.stage !== 'Admitted' && (
                    <button onClick={() => handleUpdateStage(reviewEnquiry.id, 'Rejected')} className="px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Admissions Pipeline</h2>
          <p className="text-slate-500 mt-1">Manage new student applications and enrollments.</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
          + New Application
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <UserPlus className="w-16 h-16 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-2">Total Applications</p>
          <p className="text-3xl font-black text-slate-800">{enquiries.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">Pending / New</p>
          <p className="text-3xl font-black text-amber-500">{pendingCount}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">Admitted</p>
          <p className="text-3xl font-black text-emerald-600">{approvedCount}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">Rejected</p>
          <p className="text-3xl font-black text-red-500">{rejectedCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search applications..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full" />
          </div>
          <button className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading admissions pipeline...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Parent Contact</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Applied Class</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stage</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enquiries.map((app, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-500 text-sm">{new Date(app.created_at).toLocaleDateString()}</td>
                  <td className="p-4 font-bold text-slate-800">{app.student_name}</td>
                  <td className="p-4">
                    <p className="font-medium text-slate-700">{app.parent_name}</p>
                    <p className="text-xs text-slate-500">{app.contact_number}</p>
                  </td>
                  <td className="p-4 text-slate-600">{app.admission_for_class || 'N/A'}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold 
                      ${app.stage === 'Admitted' ? 'text-emerald-600 bg-emerald-50' : 
                        app.stage === 'Rejected' ? 'text-red-600 bg-red-50' : 
                        'text-amber-600 bg-amber-50'}
                    `}>
                      {app.stage === 'Admitted' ? <CheckCircle className="w-3.5 h-3.5" /> :
                       app.stage === 'Rejected' ? <XCircle className="w-3.5 h-3.5" /> :
                       <Clock className="w-3.5 h-3.5" />}
                      {app.stage}
                    </span>
                  </td>
                  <td className="p-4">
                    <button onClick={() => setReviewEnquiry(app)} className="text-sm font-bold text-blue-600 hover:text-blue-800">Review</button>
                  </td>
                </tr>
              ))}
              {enquiries.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No applications received yet. Wait for inquiries or add one manually.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
