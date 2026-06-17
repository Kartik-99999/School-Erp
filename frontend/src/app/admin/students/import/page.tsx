"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { downloadCsvTemplate } from "@/lib/download";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Download,
} from "lucide-react";

export default function BulkImportStudentsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        setError("Please upload a valid CSV file.");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError("");
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/students/bulk-import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to upload and process the file.");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // dob/date_of_joining = YYYY-MM-DD; class_name/section_name are created if missing.
    downloadCsvTemplate(
      "student_import_template.csv",
      [
        "first_name",
        "last_name",
        "dob",
        "gender",
        "class_name",
        "section_name",
        "date_of_joining",
        "blood_group",
        "nationality",
        "religion",
        "category",
        "mother_tongue",
        "apaar_id",
        "aadhaar_no",
        "pen_number",
        "father_name",
        "father_phone",
        "father_email",
        "mother_name",
        "mother_phone",
        "mother_email",
        "guardian_name",
        "guardian_phone",
        "guardian_relation",
        "parent_email",
        "address",
      ],
      [
        "Aarav",
        "Sharma",
        "2012-05-01",
        "Male",
        "Grade 5",
        "A",
        "2024-04-01",
        "O+",
        "Indian",
        "Hindu",
        "General",
        "Hindi",
        "",
        "",
        "",
        "Rakesh Sharma",
        "9000000001",
        "rakesh@example.com",
        "Sunita Sharma",
        "9000000002",
        "sunita@example.com",
        "",
        "",
        "",
        "rakesh@example.com",
        "12 MG Road",
      ]
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-surface rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-ink-muted" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-ink">Bulk Import Students</h2>
          <p className="text-ink-muted mt-1">
            Upload a CSV file to enroll multiple students at once.
          </p>
        </div>
      </div>

      <div className="bg-surface-card rounded-card shadow-sm border border-border p-8">
        {/* Template Download Section */}
        <div className="mb-8 p-6 bg-primary-50/50 rounded-card border border-primary-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-ink flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Step 1: Download Template
            </h3>
            <p className="text-sm text-primary-700 mt-1">
              Please use the exact column headers provided in the template.
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-surface-card text-primary-600 border border-primary-100 rounded-xl font-bold hover:bg-primary-50 transition-colors whitespace-nowrap shadow-sm"
          >
            <Download className="w-4 h-4" /> Download CSV
          </button>
        </div>

        {/* Upload Section */}
        <div className="space-y-4">
          <h3 className="font-bold text-ink text-lg">Step 2: Upload Data</h3>

          <div
            className={`border-2 border-dashed rounded-card p-10 text-center transition-colors ${file ? "border-emerald-400 bg-emerald-50/30" : "border-border hover:border-blue-400 hover:bg-primary-50/30"}`}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-3">
              <div
                className={`p-4 rounded-full ${file ? "bg-emerald-100 text-emerald-600" : "bg-surface text-ink-muted"}`}
              >
                {file ? <CheckCircle2 className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
              </div>
              <div>
                <p className="font-bold text-ink text-lg">
                  {file ? file.name : "Click to select CSV file"}
                </p>
                <p className="text-sm text-ink-muted mt-1">
                  {file ? `${(file.size / 1024).toFixed(2)} KB` : "Only .csv files are supported"}
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="font-medium text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-sm transition-all ${!file || loading ? "bg-border cursor-not-allowed" : "bg-primary-600 hover:bg-primary-700"}`}
            >
              {loading ? (
                <>Processing...</>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import Students
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="mt-8 pt-8 border-t border-border">
            <h3 className="font-bold text-ink text-lg mb-4">Import Results</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-emerald-50 rounded-card border border-emerald-100">
                <p className="text-sm font-medium text-emerald-600 mb-1">Successfully Imported</p>
                <p className="text-3xl font-bold text-emerald-700">{result.success_count}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-card border border-red-100">
                <p className="text-sm font-medium text-red-600 mb-1">Failed Rows</p>
                <p className="text-3xl font-bold text-red-700">{result.failed_count}</p>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="font-bold text-ink text-sm">Error Details:</p>
                <div className="max-h-64 overflow-y-auto bg-surface border border-border rounded-xl p-4 space-y-3">
                  {result.errors.map((err: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex gap-3 text-sm border-b border-border pb-2 last:border-0 last:pb-0"
                    >
                      <span className="font-bold text-ink-muted shrink-0">Row {err.row}:</span>
                      <span className="text-red-600">{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
