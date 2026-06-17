import api from "../axios";

export const getExamTypes = async () => {
  return (await api.get<{ success: boolean; data: any[] }>("/exams/types")).data;
};

export const createExamType = async (data: any) => {
  return (await api.post("/exams/types", data)).data;
};

export const getGradeScales = async () => {
  return (await api.get<{ success: boolean; data: any[] }>("/exams/grades")).data;
};

export const createGradeScale = async (data: any) => {
  return (await api.post("/exams/grades", data)).data;
};

export const getExams = async (classId?: string, academicYearId?: string) => {
  let url = "/exams?";
  if (classId) url += `class_id=${classId}&`;
  if (academicYearId) url += `academic_year_id=${academicYearId}`;
  return (await api.get<{ success: boolean; data: any[] }>(url)).data;
};

export const createExam = async (data: any) => {
  return (await api.post("/exams", data)).data;
};

export const getExamSchedules = async (examId: string) => {
  return (await api.get<{ success: boolean; data: any[] }>(`/exams/${examId}/schedules`)).data;
};

export const createExamSchedule = async (data: any) => {
  return (await api.post("/exams/schedules", data)).data;
};

export const getStudentMarks = async (scheduleId: string) => {
  return (await api.get<{ success: boolean; data: any[] }>(`/exams/schedules/${scheduleId}/marks`))
    .data;
};

export const bulkEnterMarks = async (data: any) => {
  return (await api.post("/exams/marks/bulk", data)).data;
};

export const processExamResults = async (examId: string) => {
  return (await api.post(`/exams/${examId}/process`)).data;
};

export const getExamResults = async (examId: string) => {
  return (await api.get<{ success: boolean; data: any[] }>(`/exams/${examId}/results`)).data;
};

export const getReportCardUrl = (examId: string, studentId: string) => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  return `${baseURL}/exams/${examId}/report-card/${studentId}`;
};
