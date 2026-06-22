import api from "../axios";

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

export const getGalleries = async (): Promise<Gallery[]> =>
  (await api.get<{ success: boolean; data: Gallery[] }>("/communication/galleries")).data.data;

export const getGallery = async (id: string): Promise<GalleryDetail | null> =>
  (await api.get<{ success: boolean; data: GalleryDetail }>(`/communication/galleries/${id}`)).data
    .data;
