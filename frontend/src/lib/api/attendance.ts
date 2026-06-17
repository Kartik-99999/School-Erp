import api from "../axios";

export const getStudentDailyAttendance = async (
  classId: string,
  sectionId: string,
  date: string
) => {
  return (
    await api.get<{ success: boolean; data: any[] }>(
      `/attendance/students/daily?class_id=${classId}&section_id=${sectionId}&target_date=${date}`
    )
  ).data;
};

export const markStudentBulkAttendance = async (data: any) => {
  return (await api.post("/attendance/students/bulk", data)).data;
};

export const getAttendanceThreshold = async (classId?: string, threshold?: number) => {
  let url = `/attendance/students/threshold?threshold=${threshold || 75}`;
  if (classId) url += `&class_id=${classId}`;
  return (await api.get<{ success: boolean; data: any[] }>(url)).data;
};

export const getStaffDailyAttendance = async (date: string) => {
  return (await api.get<{ success: boolean; data: any[] }>(`/staff/attendance/daily?date=${date}`))
    .data;
};

export const markStaffBulkAttendance = async (data: any) => {
  return (await api.post("/attendance/staff/bulk", data)).data;
};

export const getMonthlyRegisterUrl = (
  classId: string,
  sectionId: string,
  month: number,
  year: number
) => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  return `${baseURL}/attendance/students/register/pdf?class_id=${classId}&section_id=${sectionId}&month=${month}&year=${year}`;
};
