import api from "../axios";

export const getDashboardStats = async () => {
  return (await api.get<{ success: boolean; data: any }>("/reports/dashboard-stats")).data;
};

// For exports, we don't use the standard Axios interactor because we need to handle the Blob download
export const getExportUrl = (reportType: string) => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  return `${baseURL}/reports/export/${reportType}`;
};
