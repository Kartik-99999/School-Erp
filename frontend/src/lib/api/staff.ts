import api from "../axios";

export interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  designation: string;
  department: string;
  phone: string;
}

export const getStaff = async (department?: string) => {
  const url = department ? `/staff?department=${department}` : "/staff";
  return (await api.get<{ success: boolean; data: Staff[] }>(url)).data;
};

export const createStaff = async (data: any) => {
  return (await api.post("/staff", data)).data;
};

export const getStaffProfile = async (id: string) => {
  return (await api.get<{ success: boolean; data: Staff }>(`/staff/${id}`)).data;
};

export const bulkImportStaff = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return (
    await api.post("/staff/bulk-import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;
};

export const getSalaryStructure = async (staffId: string) => {
  return (await api.get<{ success: boolean; data: any }>(`/payroll/structure/${staffId}`)).data;
};

export const createSalaryStructure = async (data: any) => {
  return (await api.post("/payroll/structure", data)).data;
};

export const getLeaveTypes = async () => {
  return (await api.get<{ success: boolean; data: any[] }>("/leaves/types")).data;
};

export const createLeaveType = async (data: any) => {
  return (await api.post("/leaves/types", data)).data;
};

export const getLeaveApplications = async (status?: string) => {
  const url = status ? `/leaves/applications?status=${status}` : "/leaves/applications";
  return (await api.get<{ success: boolean; data: any[] }>("/leaves/applications")).data;
};

export const updateLeaveStatus = async (id: string, status: string) => {
  return (await api.put(`/leaves/applications/${id}/status?status=${status}`)).data;
};

export const getPayslipUrl = (staffId: string, month: string, year: string) => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  return `${baseURL}/payroll/payslip/${staffId}?month=${month}&year=${year}`;
};
