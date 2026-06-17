import api from "../axios";

export interface AcademicYear {
  id: string;
  school_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface Class {
  id: string;
  school_id: string;
  name: string;
  level?: string;
  numeric_value: number;
}

export interface Section {
  id: string;
  school_id: string;
  class_id: string;
  name: string;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code: string;
  type: string;
}

export interface FeeHead {
  id: string;
  school_id: string;
  name: string;
  description: string;
}

export interface FeeStructure {
  id: string;
  school_id: string;
  academic_year_id: string;
  class_id: string;
  fee_head_id: string;
  amount: number;
  frequency: string;
}

// Academic Years
export const getAcademicYears = async () =>
  (await api.get<{ success: boolean; data: AcademicYear[] }>("/academic-years")).data;
export const createAcademicYear = async (data: Partial<AcademicYear>) =>
  (await api.post("/academic-years", data)).data;

// Classes
export const getClasses = async () =>
  (await api.get<{ success: boolean; data: Class[] }>("/classes")).data;
export const createClass = async (data: Partial<Class>) => (await api.post("/classes", data)).data;
export const deleteClass = async (id: string) => (await api.delete(`/classes/${id}`)).data;

// Sections
export const getSectionsForClass = async (classId: string) =>
  (await api.get<{ success: boolean; data: Section[] }>(`/classes/${classId}/sections`)).data;
export const createSection = async (classId: string, data: Partial<Section>) =>
  (await api.post(`/classes/${classId}/sections`, data)).data;
export const deleteSection = async (sectionId: string) =>
  (await api.delete(`/classes/sections/${sectionId}`)).data;

// Subjects
export const getSubjects = async () =>
  (await api.get<{ success: boolean; data: Subject[] }>("/subjects")).data;
export const createSubject = async (data: Partial<Subject>) =>
  (await api.post("/subjects", data)).data;

// Class ↔ Subject mapping (which subjects each grade has)
export const getClassSubjects = async (classId: string) =>
  (await api.get<{ success: boolean; data: Subject[] }>(`/classes/${classId}/subjects`)).data;
export const addClassSubject = async (classId: string, subjectId: string) =>
  (await api.post(`/classes/${classId}/subjects`, { class_id: classId, subject_id: subjectId }))
    .data;
export const removeClassSubject = async (classId: string, subjectId: string) =>
  (await api.delete(`/classes/${classId}/subjects/${subjectId}`)).data;

// Fees
export const getFeeHeads = async () =>
  (await api.get<{ success: boolean; data: FeeHead[] }>("/fees/heads")).data;
export const createFeeHead = async (data: Partial<FeeHead>) =>
  (await api.post("/fees/heads", data)).data;
export const getFeeStructures = async (classId?: string) =>
  (
    await api.get<{ success: boolean; data: FeeStructure[] }>(
      `/fees/structures${classId ? `?class_id=${classId}` : ""}`
    )
  ).data;
export const createFeeStructure = async (data: Partial<FeeStructure>) =>
  (await api.post("/fees/structures", data)).data;
export const updateFeeStructure = async (
  id: string,
  data: { amount?: number; frequency?: string }
) => (await api.put(`/fees/structures/${id}`, data)).data;
export const deleteFeeStructure = async (id: string) =>
  (await api.delete(`/fees/structures/${id}`)).data;
