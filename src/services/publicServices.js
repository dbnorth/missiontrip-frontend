import axios from "axios";

const baseurl = import.meta.env.DEV ? "http://localhost:3200/missiontrips/" : "/missiontrips/";

const publicClient = axios.create({ baseURL: baseurl });

export default {
  getTrip(tripId) {
    return publicClient.get(`/public/trips/${tripId}`);
  },
  getParticipant(tripId, personId) {
    return publicClient.get(`/public/trips/${tripId}/participants/${personId}`);
  },
  donate(data) {
    return publicClient.post("/public/donations", data);
  },
};
