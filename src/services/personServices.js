import apiClient, { getBaseUrl } from "./services.js";

export default {
  getAll(params = {}) {
    return apiClient.get("/people", { params });
  },
  getOrgTripLeaders(orgId) {
    return apiClient.get("/people/org-trip-leaders", { params: { orgId } });
  },
  get(id) {
    return apiClient.get(`/people/${id}`);
  },
  create(data) {
    return apiClient.post("/people", data);
  },
  update(id, data) {
    return apiClient.put(`/people/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/people/${id}`);
  },
  getPictureUrl(picture) {
    if (!picture) return null;
    return `${getBaseUrl()}uploads/${picture}`;
  },
};
