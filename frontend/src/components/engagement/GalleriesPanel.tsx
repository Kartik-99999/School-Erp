"use client";
import React, { useEffect, useState } from "react";
import { Images, X } from "lucide-react";
import { getGalleries, getGallery, Gallery, GalleryDetail } from "@/lib/api/galleries";

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

export default function GalleriesPanel() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [album, setAlbum] = useState<GalleryDetail | null>(null);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setGalleries(await getGalleries());
    } catch (e) {
      console.error("Failed to load galleries", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openAlbum = async (id: string) => {
    setAlbum(null);
    setAlbumLoading(true);
    try {
      setAlbum(await getGallery(id));
    } catch (e) {
      console.error("Failed to open album", e);
      alert("Couldn't open this album. Please try again.");
    } finally {
      setAlbumLoading(false);
    }
  };
  const closeAlbum = () => {
    setAlbum(null);
    setAlbumLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-ink">Galleries</h2>
        <p className="text-ink-muted mt-1">Photos from school events and activities.</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-ink-muted">Loading…</div>
      ) : error ? (
        <div className="bg-surface-card rounded-card border border-border p-8 text-center text-red-600">
          Couldn't load galleries.
          <button onClick={load} className="underline ml-1 font-medium">
            Retry
          </button>
        </div>
      ) : galleries.length === 0 ? (
        <div className="bg-surface-card rounded-card border border-border p-12 text-center text-ink-muted">
          No albums published yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleries.map((g) => (
            <button
              key={g.id}
              onClick={() => openAlbum(g.id)}
              className="group text-left bg-surface-card rounded-2xl border border-border/50 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-primary-200 transition-all duration-300"
            >
              <div className="aspect-video bg-surface flex items-center justify-center overflow-hidden relative">
                {g.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.cover_url} alt={g.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <Images className="w-10 h-10 text-ink-faint group-hover:scale-110 transition-transform duration-500" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-ink truncate">{g.title}</h3>
                <p className="text-sm text-ink-muted mt-0.5">
                  {g.photo_count} photo{g.photo_count === 1 ? "" : "s"}
                  {g.event_date ? ` · ${fmt(g.event_date)}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {(albumLoading || album) && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={closeAlbum}
        >
          <div
            className="bg-surface-card rounded-3xl border border-border/50 shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto p-8 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {albumLoading && !album ? (
              <p className="text-ink-muted text-center py-8">Loading album…</p>
            ) : album ? (
              <>
                <div className="flex items-start justify-between mb-8 pb-4 border-b border-border/50">
                  <div>
                    <h3 className="text-2xl font-bold text-ink">{album.title}</h3>
                    {album.event_date ? <p className="text-sm font-medium text-primary-600 mt-1">{fmt(album.event_date)}</p> : null}
                  </div>
                  <button onClick={closeAlbum} className="p-2 bg-surface hover:bg-surface-hover text-ink-muted hover:text-ink rounded-full transition-colors" aria-label="Close">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {album.photos.length === 0 ? (
                  <p className="text-ink-muted text-center py-8">No photos in this album.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {album.photos.map((ph) => (
                      <button
                        key={ph.id}
                        onClick={() => setLightbox(ph.image_url)}
                        className="group aspect-square rounded-2xl overflow-hidden bg-surface relative shadow-sm hover:shadow-md transition-all"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ph.image_url}
                          alt={ph.caption || ""}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-8 animate-in fade-in duration-300"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300" />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-md transition-all duration-200"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
