import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface Gallery {
  id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  event_date?: string | null;
  photo_count: number;
}
export interface GalleryPhoto {
  id: string;
  image_url: string;
  caption?: string | null;
}
export interface GalleryDetail {
  id: string;
  title: string;
  description?: string | null;
  event_date?: string | null;
  photos: GalleryPhoto[];
}

export async function getGalleries(): Promise<Gallery[]> {
  if (DEV_FAKE_ROLE) return mock.galleries;
  const res = await api.get("/communication/galleries");
  return (res.data?.data ?? []) as Gallery[];
}

export async function getGallery(id: string): Promise<GalleryDetail | null> {
  if (DEV_FAKE_ROLE) return mock.galleryDetails[id] ?? null;
  const res = await api.get(`/communication/galleries/${id}`);
  return (res.data?.data ?? null) as GalleryDetail | null;
}
