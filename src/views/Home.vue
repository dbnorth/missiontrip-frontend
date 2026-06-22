<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import Utils from "../config/utils.js";
import DashboardServices from "../services/dashboardServices.js";
import ExportServices from "../services/exportServices.js";

const user = ref(null);
const summary = ref(null);
const loading = ref(false);
const selectedTripId = ref(null);

const effectiveOrgId = computed(() => Utils.effectiveOrgId(user.value));

const isOrgAdmin = computed(() => Utils.isOrgAdmin(user.value, effectiveOrgId.value));

const isTripLeader = computed(() => Utils.isTripLeader(user.value, selectedTripId.value));
const isParticipant = computed(() => Utils.isTripParticipant(user.value, selectedTripId.value));

const isTripLeaderUser = computed(() =>
  (user.value?.tripRoles || []).some((r) => r.roleName === "Trip Leader")
);

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

const permissionsMessage = computed(() => {
  const pending = Utils.pendingOrgNames(user.value);
  if (pending.length) {
    return `You have requested access to ${pending.join(", ")}. Your organization will need to add permissions for you to use this system.`;
  }
  return "Your organization will need to add permissions for you to use this system.";
});

const loadDashboard = () => {
  if (needsPermissions.value) {
    summary.value = { message: permissionsMessage.value };
    loading.value = false;
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
  loadDashboard();
};

watch(effectiveOrgId, () => {
  if (!user.value) return;
  syncSelectedTrip();
  loadDashboard();
});

onMounted(() => {
  user.value = Utils.getStore("user");
  selectedTripId.value = user.value?.currentTripId || user.value?.tripRoles?.[0]?.tripId || null;
  syncSelectedTrip();
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
        <h1 class="text-h5 mb-4">Dashboard</h1>
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
      </v-col>
    </v-row>
  </v-container>
</template>
