import api from "../axios";

export const getPeriods = async () => {
  return (await api.get<{ success: boolean; data: any[] }>("/academics/periods")).data;
};

export const createPeriod = async (data: any) => {
  return (await api.post("/academics/periods", data)).data;
};

export const getTimetable = async (classId: string, sectionId: string) => {
  return (
    await api.get<{ success: boolean; data: any[] }>(
      `/academics/timetable?class_id=${classId}&section_id=${sectionId}`
    )
  ).data;
};

export const createTimetableSlot = async (data: any) => {
  return (await api.post("/academics/timetable", data)).data;
};

export const getSyllabus = async (classId: string, subjectId: string) => {
  return (
    await api.get<{ success: boolean; data: any[] }>(
      `/academics/syllabus?class_id=${classId}&subject_id=${subjectId}`
    )
  ).data;
};

export const createSyllabusChapter = async (data: any) => {
  return (await api.post("/academics/syllabus/chapters", data)).data;
};

export const markSyllabusProgress = async (data: any) => {
  return (await api.post("/academics/syllabus/progress", data)).data;
};

export const getHomework = async (classId: string, sectionId: string) => {
  return (
    await api.get<{ success: boolean; data: any[] }>(
      `/academics/homework?class_id=${classId}&section_id=${sectionId}`
    )
  ).data;
};

export const createHomework = async (data: any) => {
  return (await api.post("/academics/homework", data)).data;
};

export const getTimetablePdfUrl = (classId: string, sectionId: string) => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  return `${baseURL}/academics/timetable/pdf?class_id=${classId}&section_id=${sectionId}`;
};

export const generateAITimetable = async (data: {
  class_id: string;
  section_id: string;
  academic_year_id: string;
}) => {
  return (await api.post("/academics/timetable/ai-generate", data)).data;
};

export const bulkImportTimetable = async (formData: FormData) => {
  return (
    await api.post("/academics/timetable/bulk-import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;
};

export const deleteTimetableSlot = async (slotId: string) => {
  return (await api.delete(`/academics/timetable/${slotId}`)).data;
};

export const deletePeriod = async (periodId: string) => {
  return (await api.delete(`/academics/periods/${periodId}`)).data;
};
