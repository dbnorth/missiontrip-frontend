<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import Utils from "../config/utils.js";
import DashboardServices from "../services/dashboardServices.js";
import TripServices from "../services/tripServices.js";
import OrganizationServices from "../services/organizationServices.js";
import ExportServices from "../services/exportServices.js";
import PersonServices from "../services/personServices.js";
import AuthServices from "../services/authServices.js";
import EditPersonDialog from "../components/EditPersonDialog.vue";
import ApplyTripDialog from "../components/ApplyTripDialog.vue";
import {
  getMissingProfileFields,
  isProfileComplete,
  personDisplayName,
} from "../utils/personProfile.js";
import { useRouter } from "vue-router";

const router = useRouter();
const user = ref(null);
const person = ref(null);
const profileLoading = ref(false);
const showProfileDialog = ref(false);
const showApplyDialog = ref(false);
const applyTripId = ref(null);
const summary = ref(null);
const leaderTrips = ref([]);
const loading = ref(false);
const selectedTripId = ref(null);
const resolvedOrgName = ref(null);

const browseOrgs = ref([]);
const browseOrgId = ref(null);
const browseTrips = ref([]);
const browseTripsLoading = ref(false);
const browseMessage = ref("");

const effectiveOrgId = computed(() => Utils.effectiveOrgId(user.value));

const isOrgAdmin = computed(() => Utils.isOrgAdmin(user.value, effectiveOrgId.value));

const isTripLeader = computed(() => Utils.isTripLeader(user.value, selectedTripId.value));
const isParticipant = computed(() => Utils.isTripParticipant(user.value, selectedTripId.value));

const isTripLeaderUser = computed(() =>
  (user.value?.tripRoles || []).some((r) => r.roleName === "Trip Leader")
);

const isTripLeaderOnly = computed(() => {
  if (!user.value || user.value.isAdmin) return false;
  const hasOrgAdmin = (user.value.orgRoles || []).some((r) => r.roleName === "Org Admin");
  return isTripLeaderUser.value && !hasOrgAdmin;
});

const showOrgScopeNotice = computed(() => Utils.showOrgScopeNotice(user.value));

const orgLabel = computed(() => {
  const orgId = effectiveOrgId.value;
  if (!orgId) return null;
  return resolvedOrgName.value || Utils.orgDisplayName(user.value, orgId);
});

const leaderTripIds = computed(
  () =>
    new Set(
      (user.value?.tripRoles || [])
        .filter((r) => r.roleName === "Trip Leader")
        .map((r) => Number(r.tripId))
    )
);

const displayLeaderTrips = computed(() => {
  let list = leaderTrips.value.filter((t) => leaderTripIds.value.has(Number(t.id)));
  if (effectiveOrgId.value) {
    list = list.filter((t) => Number(t.orgId) === Number(effectiveOrgId.value));
  }
  return list;
});

const tripOptions = computed(() => {
  let roles = user.value?.tripRoles || [];
  if (isTripLeaderUser.value) {
    roles = roles.filter((r) => r.roleName === "Trip Leader");
    if (effectiveOrgId.value) {
      roles = roles.filter((r) => Number(r.orgId) === Number(effectiveOrgId.value));
    }
  }
  return roles.map((t) => ({ title: t.tripName, value: t.tripId }));
});

const needsPermissions = computed(() => !Utils.hasActiveAccess(user.value));

const showProfileSection = computed(() => Utils.showParticipantOrPendingProfile(user.value));

// Any non-admin signed-in user can browse/apply to active trips.
const showTripBrowseSection = computed(
  () => !!user.value && !Utils.isSystemAdmin(user.value)
);

const profileName = computed(() =>
  personDisplayName(person.value, `${user.value?.firstName || ""} ${user.value?.lastName || ""}`.trim() || "Your profile")
);

const profileComplete = computed(() => isProfileComplete(person.value));

const missingProfileFields = computed(() => getMissingProfileFields(person.value));

const browseOrgItems = computed(() =>
  browseOrgs.value.map((org) => ({ title: org.name, value: Number(org.id) }))
);

const defaultBrowseOrgId = () => {
  const orgIds = browseOrgs.value.map((o) => Number(o.id));
  if (!orgIds.length) return null;

  const preferred = Utils.effectiveOrgId(user.value);
  if (preferred != null && orgIds.includes(Number(preferred))) return Number(preferred);

  const roleOrgs = Utils.getRoleOrgs(user.value);
  if (roleOrgs.length && orgIds.includes(Number(roleOrgs[0].orgId))) {
    return Number(roleOrgs[0].orgId);
  }

  return orgIds[0];
};

const loadBrowseTrips = async () => {
  if (!showTripBrowseSection.value || !browseOrgId.value) {
    browseTrips.value = [];
    return;
  }
  browseTripsLoading.value = true;
  browseMessage.value = "";
  try {
    const res = await TripServices.getBrowseTrips(browseOrgId.value);
    browseTrips.value = res.data || [];
  } catch (e) {
    browseMessage.value = e.response?.data?.message || "Unable to load trips.";
    browseTrips.value = [];
  } finally {
    browseTripsLoading.value = false;
  }
};

const loadBrowseOrgs = async () => {
  if (!showTripBrowseSection.value) {
    browseOrgs.value = [];
    browseOrgId.value = null;
    browseTrips.value = [];
    return;
  }
  try {
    const res = await TripServices.getBrowseOrgs();
    browseOrgs.value = res.data || [];
    const nextOrgId = defaultBrowseOrgId();
    browseOrgId.value = nextOrgId;
    if (nextOrgId) await loadBrowseTrips();
    else browseTrips.value = [];
  } catch {
    browseOrgs.value = [];
    browseOrgId.value = null;
    browseTrips.value = [];
  }
};

const onBrowseOrgChange = () => {
  loadBrowseTrips();
};

const viewBrowseTrip = (trip) => {
  router.push({ name: "tripBrowse", params: { tripId: trip.id } });
};

const openApplyDialog = (trip) => {
  if (trip.alreadyApplied) return;
  applyTripId.value = trip.id;
  showApplyDialog.value = true;
};

const onApplicationSaved = () => {
  browseMessage.value = "Application submitted. Your organization will review it.";
  loadBrowseTrips();
};

const loadProfile = async () => {
  if (!showProfileSection.value || !user.value?.personId) {
    person.value = null;
    return;
  }
  profileLoading.value = true;
  try {
    const res = await PersonServices.get(user.value.personId);
    person.value = res.data || null;
  } catch {
    person.value = null;
  } finally {
    profileLoading.value = false;
  }
};

const onProfileSaved = async () => {
  try {
    const res = await AuthServices.me();
    const stored = Utils.getStore("user");
    const updated = { ...stored, ...res.data };
    Utils.setStore("user", updated);
    user.value = updated;
  } catch {
    user.value = Utils.getStore("user");
  }
  await loadProfile();
};

const permissionsMessage = computed(() => {
  const pending = Utils.pendingOrgNames(user.value);
  if (pending.length) {
    return `You have requested access to ${pending.join(", ")}. Your organization will need to add permissions for you to use this system.`;
  }
  return "Your organization will need to add permissions for you to use this system.";
});

const formatLeaders = (trip) => (trip.leaderNames || []).join(", ") || "—";

const formatDate = (value) => value || "—";

const openLeaderTrip = (trip) => {
  if (trip.orgId != null) {
    const orgName =
      trip.organization?.name || Utils.orgDisplayName(user.value, trip.orgId) || null;
    Utils.setCurrentOrg(trip.orgId, orgName);
  }
};

const resolveOrgLabel = async () => {
  const orgId = effectiveOrgId.value;
  if (!orgId) {
    resolvedOrgName.value = null;
    return;
  }
  const cached = Utils.orgDisplayName(user.value, orgId);
  if (cached) {
    resolvedOrgName.value = cached;
    return;
  }
  try {
    const res = await OrganizationServices.get(orgId);
    resolvedOrgName.value = res.data?.name || null;
  } catch {
    resolvedOrgName.value = null;
  }
};

const loadLeaderTrips = async () => {
  loading.value = true;
  summary.value = null;
  try {
    await resolveOrgLabel();
    const res = await TripServices.getAll();
    leaderTrips.value = res.data || [];
  } catch (e) {
    summary.value = { error: e.response?.data?.message || "Unable to load trips." };
    leaderTrips.value = [];
  } finally {
    loading.value = false;
  }
};

const loadDashboard = () => {
  if (needsPermissions.value) {
    summary.value = { message: permissionsMessage.value };
    leaderTrips.value = [];
    loading.value = false;
    return;
  }

  if (isTripLeaderOnly.value) {
    loadLeaderTrips();
    return;
  }

  loading.value = true;
  const orgId = effectiveOrgId.value;
  const tripId = selectedTripId.value;

  let req;
  if (isOrgAdmin.value && orgId) {
    req = DashboardServices.org(orgId);
  } else if (tripId && isTripLeader.value) {
    req = DashboardServices.trip(tripId);
  } else if (tripId && isParticipant.value) {
    req = DashboardServices.participant(tripId);
  } else if (tripId) {
    req = DashboardServices.trip(tripId);
  } else if (Utils.isSystemAdmin(user.value)) {
    summary.value = {
      message: "System admin dashboard. Use People and Organizations in the menu, or emulate an organization from the menu bar.",
    };
    loading.value = false;
    return;
  } else {
    summary.value = { message: permissionsMessage.value };
    loading.value = false;
    return;
  }

  req
    .then((r) => {
      summary.value = r.data;
    })
    .catch((e) => {
      summary.value = { error: e.response?.data?.message || "Unable to load dashboard." };
    })
    .finally(() => {
      loading.value = false;
    });
};

const exportCsv = (type) => {
  const tripId = selectedTripId.value || summary.value?.trip?.id;
  if (!tripId) return;
  if (type === "participants") ExportServices.participantsCsv(tripId);
  if (type === "donors") ExportServices.donorsCsv(tripId);
  if (type === "donations") ExportServices.donationsCsv(tripId);
};

const syncSelectedTrip = () => {
  const options = tripOptions.value;
  if (!options.length) {
    selectedTripId.value = null;
    return;
  }
  if (!options.some((o) => Number(o.value) === Number(selectedTripId.value))) {
    selectedTripId.value = options[0].value;
  }
};

const onUserContextChange = () => {
  user.value = Utils.getStore("user");
  syncSelectedTrip();
  loadProfile();
  loadBrowseOrgs();
  loadDashboard();
};

watch(effectiveOrgId, () => {
  if (!user.value) return;
  syncSelectedTrip();
  if (showTripBrowseSection.value && effectiveOrgId.value) {
    if (Number(browseOrgId.value) !== Number(effectiveOrgId.value)) {
      browseOrgId.value = Number(effectiveOrgId.value);
      loadBrowseTrips();
    }
  }
  loadDashboard();
});

onMounted(() => {
  user.value = Utils.getStore("user");
  selectedTripId.value = user.value?.currentTripId || user.value?.tripRoles?.[0]?.tripId || null;
  syncSelectedTrip();
  loadProfile();
  loadBrowseOrgs();
  loadDashboard();
  window.addEventListener("user-updated", onUserContextChange);
});

onUnmounted(() => {
  window.removeEventListener("user-updated", onUserContextChange);
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card v-if="showProfileSection" class="mb-6 pa-4" variant="tonal">
          <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-2">
            <h2 class="text-h6 mb-0">{{ profileName }}</h2>
            <v-btn
              v-if="!profileComplete"
              color="primary"
              size="small"
              :disabled="!user?.personId"
              @click="showProfileDialog = true"
            >
              Complete profile
            </v-btn>
          </div>

          <v-progress-linear v-if="profileLoading" indeterminate class="mb-3" />

          <v-alert
            v-else-if="profileComplete"
            type="success"
            variant="tonal"
            density="compact"
          >
            Profile complete.
          </v-alert>

          <template v-else-if="user?.personId">
            <p class="text-body-2 mb-2">Complete your profile by filling in the missing fields below.</p>
            <ul v-if="missingProfileFields.length" class="text-body-2 mb-0">
              <li v-for="field in missingProfileFields" :key="field">{{ field }}</li>
            </ul>
          </template>

          <v-alert v-else type="warning" density="compact">
            Your account is not linked to a person record yet. Please contact your organization.
          </v-alert>
        </v-card>

        <v-card v-if="showTripBrowseSection" class="mb-6 pa-4">
          <h2 class="text-h6 mb-3">Active trips</h2>
          <v-select
            v-model="browseOrgId"
            :items="browseOrgItems"
            label="Organization"
            density="compact"
            class="mb-4"
            style="max-width: 400px"
            hide-details
            :disabled="!browseOrgItems.length"
            @update:model-value="onBrowseOrgChange"
          />

          <v-alert v-if="browseMessage" type="info" density="compact" class="mb-3">
            {{ browseMessage }}
          </v-alert>
          <v-progress-linear v-if="browseTripsLoading" indeterminate class="mb-3" />
          <v-alert
            v-else-if="!browseOrgItems.length"
            type="info"
            density="compact"
            class="mb-0"
          >
            No organizations are available to browse yet.
          </v-alert>
          <v-alert
            v-else-if="!browseTrips.length"
            type="info"
            density="compact"
            class="mb-0"
          >
            No active trips for this organization.
          </v-alert>

          <v-table v-else density="compact">
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Start</th>
                <th>End</th>
                <th class="text-right" style="min-width: 180px">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in browseTrips" :key="item.id">
                <td>{{ item.name }}</td>
                <td>{{ item.location || "—" }}</td>
                <td>{{ formatDate(item.startDate) }}</td>
                <td>{{ formatDate(item.endDate) }}</td>
                <td class="text-right">
                  <div class="d-flex justify-end ga-2 flex-wrap">
                    <v-btn size="small" variant="tonal" @click="viewBrowseTrip(item)">View</v-btn>
                    <v-btn
                      v-if="!item.alreadyApplied"
                      size="small"
                      color="primary"
                      @click="openApplyDialog(item)"
                    >
                      Apply
                    </v-btn>
                    <v-chip v-else size="small" variant="tonal" color="success">
                      {{ item.applicationStatus === "active" ? "Joined" : "Applied" }}
                    </v-chip>
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>

        <h1 class="text-h5 mb-4">Dashboard</h1>

        <template v-if="isTripLeaderOnly">
          <v-alert
            v-if="showOrgScopeNotice && orgLabel"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            Trips you lead in {{ orgLabel }}.
          </v-alert>
          <v-alert
            v-else-if="showOrgScopeNotice && !orgLabel && effectiveOrgId"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            Trips you lead in the selected organization.
          </v-alert>

          <v-progress-linear v-if="loading" indeterminate class="mb-4" />
          <v-alert v-if="needsPermissions" type="warning" prominent class="mb-4">
            {{ permissionsMessage }}
          </v-alert>
          <v-alert v-else-if="summary?.error" type="error" class="mb-4">{{ summary.error }}</v-alert>
          <v-alert
            v-else-if="!loading && !displayLeaderTrips.length"
            type="info"
            class="mb-4"
          >
            No trips you lead{{ orgLabel ? ` in ${orgLabel}` : effectiveOrgId ? " in the selected organization" : "" }}.
          </v-alert>

          <v-data-table
            v-if="!needsPermissions && displayLeaderTrips.length"
            :items="displayLeaderTrips"
            :loading="loading"
            :headers="[
              { title: 'Name', key: 'name' },
              { title: 'Leaders', key: 'leaders' },
              { title: 'Start date', key: 'startDate' },
              { title: 'End date', key: 'endDate' },
              { title: 'Active members', key: 'activeParticipantCount' },
            ]"
            density="compact"
          >
            <template #item.name="{ item }">
              <router-link
                :to="{
                  name: 'tripPeople',
                  query: { tripId: item.id, orgId: item.orgId },
                }"
                @click="openLeaderTrip(item)"
              >
                {{ item.name }}
              </router-link>
            </template>
            <template #item.leaders="{ item }">{{ formatLeaders(item) }}</template>
            <template #item.startDate="{ item }">{{ formatDate(item.startDate) }}</template>
            <template #item.endDate="{ item }">{{ formatDate(item.endDate) }}</template>
            <template #item.activeParticipantCount="{ item }">{{ item.activeParticipantCount ?? 0 }}</template>
          </v-data-table>
        </template>

        <template v-else>
          <v-select
            v-if="tripOptions.length > 1"
            v-model="selectedTripId"
            :items="tripOptions"
            label="Select trip"
            density="compact"
            class="mb-4"
            style="max-width: 400px"
            @update:model-value="loadDashboard"
          />
          <v-progress-linear v-if="loading" indeterminate class="mb-4" />
          <v-alert v-if="needsPermissions" type="warning" prominent class="mb-4">
            {{ permissionsMessage }}
          </v-alert>
          <v-alert v-else-if="summary?.error" type="error">{{ summary.error }}</v-alert>
          <v-alert v-else-if="summary?.message" type="info">{{ summary.message }}</v-alert>
          <v-alert
            v-else-if="isTripLeaderUser && !isOrgAdmin && !tripOptions.length"
            type="info"
            class="mb-4"
          >
            No trips you lead in the selected organization.
          </v-alert>

          <v-row v-if="summary && !summary.error && !summary.message">
            <v-col v-if="summary.tripCount != null" cols="12" md="3">
              <v-card><v-card-text><div class="text-caption">Trips</div><div class="text-h4">{{ summary.tripCount }}</div></v-card-text></v-card>
            </v-col>
            <v-col v-if="summary.activeTrips != null" cols="12" md="3">
              <v-card><v-card-text><div class="text-caption">Active trips</div><div class="text-h4">{{ summary.activeTrips }}</div></v-card-text></v-card>
            </v-col>
            <v-col v-if="summary.peopleCount != null" cols="12" md="3">
              <v-card><v-card-text><div class="text-caption">People</div><div class="text-h4">{{ summary.peopleCount }}</div></v-card-text></v-card>
            </v-col>
            <v-col v-if="summary.donationTotal != null" cols="12" md="3">
              <v-card><v-card-text><div class="text-caption">Donations total</div><div class="text-h4">${{ Number(summary.donationTotal).toFixed(2) }}</div></v-card-text></v-card>
            </v-col>
            <v-col v-if="summary.participants != null" cols="12" md="3">
              <v-card><v-card-text><div class="text-caption">Participants</div><div class="text-h4">{{ summary.participants }}</div></v-card-text></v-card>
            </v-col>
            <v-col v-if="summary.donationCount != null" cols="12" md="3">
              <v-card><v-card-text><div class="text-caption">Donation count</div><div class="text-h4">{{ summary.donationCount }}</div></v-card-text></v-card>
            </v-col>
          </v-row>

          <div v-if="selectedTripId || summary?.trip?.id" class="mt-4">
            <v-btn class="mr-2" size="small" @click="exportCsv('participants')">Export participants CSV</v-btn>
            <v-btn class="mr-2" size="small" @click="exportCsv('donors')">Export donors CSV</v-btn>
            <v-btn size="small" @click="exportCsv('donations')">Export donations CSV</v-btn>
          </div>
        </template>
      </v-col>
    </v-row>

    <EditPersonDialog
      v-if="showProfileSection && user?.personId"
      v-model="showProfileDialog"
      :person-id="user.personId"
      @saved="onProfileSaved"
    />
    <ApplyTripDialog
      v-model="showApplyDialog"
      :trip-id="applyTripId"
      @saved="onApplicationSaved"
    />
  </v-container>
</template>
