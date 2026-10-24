import api from "./api";

// Blood search + inventory
export const searchBlood = (params) =>
  api.get("/blood/search", { params }).then((r) => r.data);
export const getInventory = () => api.get("/blood/inventory").then((r) => r.data);
export const updateInventory = (blood_group, units) =>
  api.put("/blood/inventory", { blood_group, units }).then((r) => r.data);

// Emergency requests
export const getEmergencies = () => api.get("/emergency").then((r) => r.data);
export const createEmergency = (payload) =>
  api.post("/emergency", payload).then((r) => r.data);
export const acceptEmergency = (id) =>
  api.put(`/emergency/${id}/accept`).then((r) => r.data);
export const rejectEmergency = (id) =>
  api.put(`/emergency/${id}/reject`).then((r) => r.data);

// Notifications
export const getNotifications = () =>
  api.get("/notifications").then((r) => r.data);
export const markNotificationRead = (id) =>
  api.put(`/notifications/${id}/read`).then((r) => r.data);

// Admin
export const getHospitals = () => api.get("/admin/hospitals").then((r) => r.data);
export const saveHospital = (payload) =>
  api.post("/admin/hospitals", payload).then((r) => r.data);
export const getReports = () => api.get("/admin/reports").then((r) => r.data);