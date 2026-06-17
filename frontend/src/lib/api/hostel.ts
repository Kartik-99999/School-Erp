import api from "../axios";

export const getBuildings = async () => {
  return (await api.get<{ success: boolean; data: any[] }>("/hostel/buildings")).data;
};

export const createBuilding = async (data: any) => {
  return (await api.post("/hostel/buildings", data)).data;
};

export const getRooms = async (buildingId?: string) => {
  const url = buildingId ? `/hostel/rooms?building_id=${buildingId}` : "/hostel/rooms";
  return (await api.get<{ success: boolean; data: any[] }>(url)).data;
};

export const createRoom = async (data: any) => {
  return (await api.post("/hostel/rooms", data)).data;
};

export const assignRoom = async (data: any) => {
  return (await api.post("/hostel/allocations", data)).data;
};

export const getAllocations = async () => {
  return (await api.get<{ success: boolean; data: any[] }>("/hostel/allocations")).data;
};

export const vacateRoom = async (allocId: string) => {
  return (await api.post(`/hostel/allocations/${allocId}/vacate`)).data;
};
