import axios from "axios";

const baseurl = import.meta.env.DEV ? "http://localhost:3200/missiontrips/" : "/missiontrips/";

const publicClient = axios.create({ baseURL: baseurl });

export default {
  getTripBySlug(tripSlug) {
    return publicClient.get(`/public/trips/by-name/${encodeURIComponent(tripSlug)}`);
  },
  getParticipantBySlug(tripSlug, personSlug) {
    return publicClient.get(
      `/public/trips/by-name/${encodeURIComponent(tripSlug)}/participants/${encodeURIComponent(personSlug)}`
    );
  },
  donate(data) {
    return publicClient.post("/public/donations", data);
  },
};
