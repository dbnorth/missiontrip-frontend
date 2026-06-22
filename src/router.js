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
    { path: "/trip-people", name: "tripPeople", component: TripPeopleRolesList },
    { path: "/donations", name: "donations", component: DonationsList },
    { path: "/templates", name: "templates", component: EmailTemplatesList },
    { path: "/donate/trip/:tripId", name: "donorTrip", component: DonorTripPage, props: true },
    {
      path: "/donate/trip/:tripId/participant/:personId",
      name: "donorParticipant",
      component: DonorParticipantPage,
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
  if (to.name === "templates" && !user.isAdmin) {
    const isOrgAdmin = (user.orgRoles || []).some((r) => r.roleName === "Org Admin");
    const isTripLeader = (user.tripRoles || []).some((r) => r.roleName === "Trip Leader");
    if (!isOrgAdmin && !isTripLeader) {
      next({ name: "home" });
      return;
    }
  }
  next();
});

export default router;
