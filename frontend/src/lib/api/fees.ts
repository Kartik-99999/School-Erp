import api from "../axios";

// Structures and Heads were added in Module 1 to setup.ts
// Additional Fee Management Methods

export const getConcessions = async () => {
  return (await api.get<{ success: boolean; data: any[] }>("/fees/concessions")).data;
};

export const createConcession = async (data: any) => {
  return (await api.post("/fees/concessions", data)).data;
};

export const bulkGenerateDues = async (data: {
  academic_year_id: string;
  class_id: string;
  due_date: string;
}) => {
  return (await api.post("/fees/dues/generate", data)).data;
};

export const getDues = async (filters?: Record<string, string>) => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
  }
  return (await api.get<{ success: boolean; data: any[] }>(`/fees/dues?${params.toString()}`)).data;
};

export const recordOfflinePayment = async (data: any) => {
  return (await api.post("/fees/payments/offline", data)).data;
};

export const getReceipts = async (studentId?: string) => {
  const url = studentId ? `/fees/receipts?student_id=${studentId}` : "/fees/receipts";
  return (await api.get<{ success: boolean; data: any[] }>(url)).data;
};

export const getReceiptPdfUrl = (receiptId: string) => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  return `${baseURL}/fees/receipts/${receiptId}/pdf`;
};
