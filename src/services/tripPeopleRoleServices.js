import apiClient from "./services.js";

export default {
  getAll(tripId) {
    return apiClient.get("/trip-people-roles", { params: { tripId } });
  },
  create(data) {
    return apiClient.post("/trip-people-roles", data);
  },
  update(id, data) {
    return apiClient.put(`/trip-people-roles/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/trip-people-roles/${id}`);
  },
};
