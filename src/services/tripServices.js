import apiClient, { getBaseUrl } from "./services.js";

export default {
  getAll() {
    return apiClient.get("/trips");
  },
  get(id) {
    return apiClient.get(`/trips/${id}`);
  },
  create(data) {
    return apiClient.post("/trips", data);
  },
  update(id, data) {
    return apiClient.put(`/trips/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/trips/${id}`);
  },
  getImageUrl(image) {
    if (!image) return null;
    return `${getBaseUrl()}uploads/${image}`;
  },
};
