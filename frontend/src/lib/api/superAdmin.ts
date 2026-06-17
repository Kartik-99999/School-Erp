import api from "../axios";

export const getSuperAdminStats = async () => {
  return (await api.get<{ success: boolean; data: any }>("/super-admin/dashboard-stats")).data;
};

export const getSchools = async () => {
  return (await api.get<{ success: boolean; data: any[] }>("/super-admin/schools")).data;
};

export const updateSchoolStatus = async (id: string, status: string) => {
  return (await api.put(`/super-admin/schools/${id}/status?status=${status}`)).data;
};

export const createSchool = async (data: any) => {
  return (await api.post("/super-admin/schools", data)).data;
};

export const updateSchool = async (id: string, data: any) => {
  return (await api.put(`/super-admin/schools/${id}`, data)).data;
};

export const deleteSchool = async (id: string) => {
  return (await api.delete(`/super-admin/schools/${id}`)).data;
};

export const getBillingHistory = async () => {
  return (await api.get<{ success: boolean; data: any[] }>("/super-admin/billing")).data;
};
