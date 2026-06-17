import api from "../axios";

export const getBooks = async (search?: string, category?: string) => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (category) params.append("category", category);
  return (await api.get<{ success: boolean; data: any[] }>(`/library/books?${params.toString()}`))
    .data;
};

export const createBook = async (data: any) => {
  return (await api.post("/library/books", data)).data;
};

export const lookupIsbn = async (isbn: string) => {
  return (await api.get<{ success: boolean; data: any }>(`/library/lookup/isbn/${isbn}`)).data;
};

export const issueBook = async (data: any) => {
  return (await api.post("/library/issues", data)).data;
};

export const getIssues = async (status?: string, studentId?: string) => {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (studentId) params.append("student_id", studentId);
  return (await api.get<{ success: boolean; data: any[] }>(`/library/issues?${params.toString()}`))
    .data;
};

export const returnBook = async (issueId: string) => {
  return (await api.post(`/library/issues/${issueId}/return`)).data;
};
