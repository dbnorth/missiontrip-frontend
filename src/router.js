import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils.js";
import Login from "./views/Login.vue";
import Home from "./views/Home.vue";
import PeopleList from "./views/PeopleList.vue";
import OrganizationsList from "./views/OrganizationsList.vue";
import TripsList from "./views/TripsList.vue";
import TripView from "./views/TripView.vue";
import TripPeopleRolesList from "./views/TripPeopleRolesList.vue";
import DonationsList from "./views/DonationsList.vue";
import EmailTemplatesList from "./views/EmailTemplatesList.vue";
import WorkerRolesList from "./views/WorkerRolesList.vue";
import DocumentTypesList from "./views/DocumentTypesList.vue";
import TripBrowseView from "./views/TripBrowseView.vue";
import DonorTripPage from "./views/DonorTripPage.vue";
import DonorParticipantPage from "./views/DonorParticipantPage.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", alias: "/login", name: "login", component: Login },
    { path: "/home", name: "home", component: Home },
    { path: "/people", name: "people", component: PeopleList },
    { path: "/organizations", name: "organizations", component: OrganizationsList },
    { path: "/trips", name: "trips", component: TripsList },
    { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
    { path: "/browse-trips/:tripId", name: "tripBrowse", component: TripBrowseView, props: true },
    { path: "/trip-people", name: "tripPeople", component: TripPeopleRolesList },
    { path: "/donations", name: "donations", component: DonationsList },
    { path: "/templates", name: "templates", component: EmailTemplatesList },
    { path: "/worker-roles", name: "workerRoles", component: WorkerRolesList },
    { path: "/document-types", name: "documentTypes", component: DocumentTypesList },
    {
      path: "/donate/trip/:tripSlug/participant/:personSlug",
      name: "donorParticipant",
      component: DonorParticipantPage,
      props: true,
    },
    {
      path: "/donate/trip/:tripSlug",
      name: "donorTrip",
      component: DonorTripPage,
      props: true,
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const user = Utils.getStore("user");
  const publicRoutes = ["login", "donorTrip", "donorParticipant"];
  if (publicRoutes.includes(to.name)) {
    if (to.name === "login" && user) next({ name: "home" });
    else next();
    return;
  }
  if (!user) {
    next({ name: "login" });
    return;
  }
  if (to.name === "organizations" && !user.isAdmin) {
    next({ name: "home" });
    return;
  }
  if (to.name === "documentTypes" && !user.isAdmin) {
    next({ name: "home" });
    return;
  }
  if (to.name === "tripBrowse" && !Utils.showParticipantOrPendingProfile(user)) {
    next({ name: "home" });
    return;
  }
  if (to.name === "templates" && !user.isAdmin) {
    const isOrgAdmin = (user.orgRoles || []).some((r) => r.roleName === "Org Admin");
    const isTripLeader = (user.tripRoles || []).some((r) => r.roleName === "Trip Leader");
    if (!isOrgAdmin && !isTripLeader) {
      next({ name: "home" });
      return;
    }
  }
  if (to.name === "workerRoles" && !user.isAdmin) {
    const isOrgAdmin = (user.orgRoles || []).some((r) => r.roleName === "Org Admin");
    if (!isOrgAdmin) {
      next({ name: "home" });
      return;
    }
  }
  next();
});

export default router;
