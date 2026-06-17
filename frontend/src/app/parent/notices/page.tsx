"use client";
import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import {
  Megaphone,
  Calendar,
  FileText,
  Bell,
  Image as ImageIcon,
  Download,
  Heart,
  MessageCircle,
  Share2,
  Filter,
} from "lucide-react";

export default function ParentFeedPage() {
  const [activeTag, setActiveTag] = useState("All");
  const tags = ["All", "Notice", "Circular", "Resources", "Announcement", "Gallery"];
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock Feed Data as fallback

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await api.get("/communication/notices?target=Parents");
        if (res.data.success && res.data.data.length > 0) {
          const mapped = res.data.data.map((notice: any) => ({
            id: notice.id,
            type: notice.notice_type || "Notice",
            author: "School Admin",
            date: new Date(notice.created_at).toLocaleDateString(),
            title: notice.title,
            desc: notice.content,
            likes: 0,
            comments: 0,
            images: [],
          }));
          setFeedItems(mapped);
        } else {
          setFeedItems([]);
        }
      } catch (err) {
        setFeedItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  const filteredFeed =
    activeTag === "All"
      ? feedItems
      : feedItems.filter((item) => (item.type || "").toLowerCase() === activeTag.toLowerCase());

  const getTagColor = (type: string) => {
    switch (type) {
      case "Circular":
        return "bg-purple-100 text-purple-700";
      case "Notice":
        return "bg-primary-50 text-primary-700";
      case "Resources":
        return "bg-emerald-100 text-emerald-700";
      case "Announcement":
        return "bg-red-100 text-red-700";
      case "Gallery":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-surface text-ink";
    }
  };

  const getTagIcon = (type: string) => {
    switch (type) {
      case "Circular":
        return <Megaphone className="w-4 h-4" />;
      case "Notice":
        return <Bell className="w-4 h-4" />;
      case "Resources":
        return <FileText className="w-4 h-4" />;
      case "Announcement":
        return <Megaphone className="w-4 h-4" />;
      case "Gallery":
        return <ImageIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">School Feed</h2>
          <p className="text-ink-muted mt-1">Updates, galleries, and resources from your school.</p>
        </div>
        <button className="p-2 border border-border rounded-xl text-ink-muted hover:bg-surface flex items-center gap-2 px-4 shadow-sm bg-surface-card">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      {/* Tags Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm
              ${
                activeTag === tag
                  ? "bg-slate-800 text-white shadow-md scale-105"
                  : "bg-surface-card text-ink-muted border border-border hover:bg-surface"
              }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Feed Stream */}
      <div className="space-y-6">
        {filteredFeed.map((item) => (
          <div
            key={item.id}
            className="bg-surface-card rounded-card border border-border shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-500"
          >
            {/* Post Header */}
            <div className="p-6 pb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-ink-faint border border-border">
                  <span className="font-bold text-lg text-ink-muted">{item.author[0]}</span>
                </div>
                <div>
                  <h4 className="font-bold text-ink">{item.author}</h4>
                  <p className="text-xs text-ink-muted font-medium">{item.date}</p>
                </div>
              </div>
              <span
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getTagColor(item.type)}`}
              >
                {getTagIcon(item.type)} {item.type}
              </span>
            </div>

            {/* Post Content */}
            <div className="px-6 pb-4">
              <h3 className="text-xl font-bold text-ink mb-2">{item.title}</h3>
              <p className="text-ink-muted text-sm leading-relaxed">{item.desc}</p>
            </div>

            {/* Attachments */}
            {item.attachments && (
              <div className="px-6 pb-4">
                {item.attachments.map((att: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-surface border border-border rounded-card hover:bg-surface transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink group-hover:text-primary-600 transition-colors">
                          {att.name}
                        </p>
                        <p className="text-xs text-ink-muted">{att.size} • PDF</p>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-ink-faint group-hover:text-primary-600" />
                  </div>
                ))}
              </div>
            )}

            {/* Image Gallery Grid */}
            {item.images && item.images.length > 0 && (
              <div
                className={`px-6 pb-4 grid gap-2 ${
                  item.images.length === 1
                    ? "grid-cols-1"
                    : item.images.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-2"
                }`}
              >
                {item.images.map((img: string, i: number) => (
                  <div
                    key={i}
                    className={`relative rounded-card overflow-hidden bg-surface border border-border ${item.images.length === 3 && i === 0 ? "col-span-2 aspect-video" : "aspect-square"}`}
                  >
                    <img
                      src={img}
                      alt="Gallery"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Social Actions */}
            <div className="px-6 py-4 border-t border-border flex items-center gap-6 bg-surface/50">
              <button className="flex items-center gap-2 text-ink-muted hover:text-rose-500 transition-colors group">
                <Heart className="w-5 h-5 group-hover:fill-rose-500" />
                <span className="text-sm font-bold">{item.likes}</span>
              </button>
              <button className="flex items-center gap-2 text-ink-muted hover:text-blue-500 transition-colors group">
                <MessageCircle className="w-5 h-5 group-hover:fill-blue-500" />
                <span className="text-sm font-bold">{item.comments}</span>
              </button>
              <button className="flex items-center gap-2 text-ink-muted hover:text-ink transition-colors ml-auto">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        {filteredFeed.length === 0 && (
          <div className="text-center p-12 bg-surface-card rounded-card border border-border">
            <Megaphone className="w-12 h-12 text-ink-faint mx-auto mb-3" />
            <p className="text-ink-muted font-medium">No posts found for this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
