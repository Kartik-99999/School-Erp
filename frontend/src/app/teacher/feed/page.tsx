"use client";
import React, { useState } from "react";
import api from "@/lib/axios";
import {
  Megaphone,
  Image as ImageIcon,
  FileText,
  Send,
  Link as LinkIcon,
  AlertCircle,
} from "lucide-react";

export default function TeacherFeedUploadPage() {
  const [postType, setPostType] = useState("Resources");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);
    try {
      await api.post("/communication/notices", {
        title,
        body,
        target_audience: "Students",
        is_pinned: false,
      });
      alert("Post published successfully to the Student Feed!");
      setTitle("");
      setBody("");
    } catch (err) {
      console.error(err);
      alert("Failed to publish post.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Post to School Feed</h2>
          <p className="text-ink-muted mt-1">
            Publish circulars, study materials, or photo galleries directly to the student portal.
          </p>
        </div>
      </div>

      <div className="bg-surface-card rounded-card border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-surface/50 flex flex-wrap gap-4 items-center">
          <p className="text-sm font-bold text-ink w-full sm:w-auto">Select Post Type:</p>
          <div className="flex flex-wrap gap-2">
            {["Resources", "Notice", "Gallery", "Announcement"].map((type) => (
              <button
                key={type}
                onClick={() => setPostType(type)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all
                  ${postType === type ? "bg-primary-600 text-white shadow-md shadow-sm" : "bg-surface-card text-ink-muted border border-border hover:bg-surface"}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <form className="p-6 md:p-8 space-y-6" onSubmit={handlePublish}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-ink mb-2">Post Title</label>
              <input
                type="text"
                placeholder="e.g., Chapter 4: Thermodynamics Study Guide"
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-ink mb-2">Target Audience</label>
              <select className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500">
                <option>All My Classes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-ink mb-2">
                Schedule Post (Optional)
              </label>
              <input
                type="datetime-local"
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-ink mb-2">Description / Message</label>
              <textarea
                rows={5}
                placeholder="Type your message here..."
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              ></textarea>
            </div>
          </div>

          {/* Attachments Section based on Post Type */}
          <div className="p-6 border-2 border-dashed border-border rounded-card bg-surface/50 hover:bg-surface transition-colors text-center group cursor-pointer">
            {postType === "Gallery" ? (
              <>
                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="font-bold text-ink">Upload Photos for Gallery</p>
                <p className="text-xs text-ink-muted mt-1">
                  Drag and drop images, or click to browse (JPG, PNG)
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="font-bold text-ink">Attach Resources or Documents</p>
                <p className="text-xs text-ink-muted mt-1">PDF, DOCX, PPTX up to 25MB</p>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              This post will instantly notify students in the selected target audience via email and
              the Student Portal feed.
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              type="button"
              className="px-6 py-3 text-ink-muted font-bold hover:bg-surface rounded-xl transition-colors mr-3"
            >
              Save Draft
            </button>
            <button
              type="submit"
              disabled={publishing}
              className="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-lg shadow-sm disabled:opacity-60"
            >
              <Send className="w-4 h-4" /> {publishing ? "Publishing..." : "Publish to Feed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
