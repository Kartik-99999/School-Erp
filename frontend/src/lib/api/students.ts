import api from "../axios";

export interface Parent {
  id?: string;
  father_name?: string;
  father_phone?: string;
  mother_name?: string;
  guardian_name?: string;
  primary_contact_email?: string;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  current_class_id: string;
  current_section_id: string;
  academic_year_id: string;
  status: string;
  parent?: Parent;
  class_name?: string;
  section_name?: string;
}

export const getStudents = async (filters?: Record<string, any>) => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v as string);
    });
  }
  return (await api.get<{ success: boolean; data: Student[] }>(`/students?${params.toString()}`))
    .data;
};

export const createStudent = async (data: any) => {
  return (await api.post("/students", data)).data;
};

export const updateStudent = async (id: string, data: any) => {
  return (await api.put(`/students/${id}`, data)).data;
};

export const getStudentProfile = async (id: string) => {
  return (await api.get<{ success: boolean; data: Student }>(`/students/${id}`)).data;
};

export const bulkImportStudents = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return (
    await api.post("/students/bulk-import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;
};

export const promoteStudents = async (data: {
  student_ids: string[];
  next_class_id: string;
  next_section_id: string;
  academic_year_id: string;
}) => {
  return (await api.post("/students/promote", data)).data;
};

// URL helper for certificates (assuming cookie/token is passed or handled via temp token. In this demo, we'll hit API directly)
export const getCertificateUrl = (studentId: string, type: string) => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  // Note: For secure PDF download in real app, use fetch with Blob or append JWT to query param
  return `${baseURL}/students/${studentId}/certificates/${type}`;
};
