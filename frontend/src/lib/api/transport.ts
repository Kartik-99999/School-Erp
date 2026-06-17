import api from "../axios";

export const getVehicles = async () => {
  return (await api.get<{ success: boolean; data: any[] }>("/transport/vehicles")).data;
};

export const createVehicle = async (data: any) => {
  return (await api.post("/transport/vehicles", data)).data;
};

export const getRoutes = async () => {
  return (await api.get<{ success: boolean; data: any[] }>("/transport/routes")).data;
};

export const createRoute = async (data: any) => {
  return (await api.post("/transport/routes", data)).data;
};

export const getRouteStops = async (routeId: string) => {
  return (await api.get<{ success: boolean; data: any[] }>(`/transport/routes/${routeId}/stops`))
    .data;
};

export const createStop = async (data: any) => {
  return (await api.post("/transport/stops", data)).data;
};

export const assignStudentToTransport = async (data: any) => {
  return (await api.post("/transport/assignments", data)).data;
};

export const getRouteStudents = async (routeId: string) => {
  return (await api.get<{ success: boolean; data: any[] }>(`/transport/routes/${routeId}/students`))
    .data;
};

export const getManifestPdfUrl = (routeId: string) => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  return `${baseURL}/transport/routes/${routeId}/manifest/pdf`;
};
