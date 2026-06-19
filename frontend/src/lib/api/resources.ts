import api from "../axios";

export interface Resource {
  id: string;
  school_id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  external_url: string | null;
  target_audience: string;
  target_class_id: string | null;
  target_section_id: string | null;
  subject_id: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ResourceCreateFields {
  title: string;
  category: string;
  target_audience: string;
  description?: string;
  external_url?: string;
  target_class_id?: string;
  subject_id?: string;
  file?: File | null;
}

export const listResources = async (category?: string): Promise<Resource[]> =>
  (await api.get(`/resources${category ? `?category=${encodeURIComponent(category)}` : ""}`)).data
    .data;

export const createResource = async (f: ResourceCreateFields): Promise<Resource> => {
  const fd = new FormData();
  fd.append("title", f.title);
  fd.append("category", f.category);
  fd.append("target_audience", f.target_audience);
  if (f.description) fd.append("description", f.description);
  if (f.external_url) fd.append("external_url", f.external_url);
  if (f.target_class_id) fd.append("target_class_id", f.target_class_id);
  if (f.subject_id) fd.append("subject_id", f.subject_id);
  if (f.file) fd.append("file", f.file);
  return (await api.post("/resources", fd, { headers: { "Content-Type": "multipart/form-data" } }))
    .data.data;
};

export const deleteResource = async (id: string): Promise<void> => {
  await api.delete(`/resources/${id}`);
};
