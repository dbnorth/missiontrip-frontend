import apiClient, { getBaseUrl } from "./services.js";

export default {
  getAll() {
    return apiClient.get("/organizations");
  },
  getAllForMenu() {
    return apiClient.get("/organizations", { skipOrgScope: true });
  },
  get(id) {
    return apiClient.get(`/organizations/${id}`);
  },
  create(data) {
    return apiClient.post("/organizations", data);
  },
  update(id, data) {
    return apiClient.put(`/organizations/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/organizations/${id}`);
  },
  uploadLogo(id, file) {
    const form = new FormData();
    form.append("logo", file);
    return apiClient.put(`/organizations/${id}/logo`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getLogoUrl(logo) {
    if (!logo) return null;
    return `${getBaseUrl()}uploads/${logo}`;
  },
};
