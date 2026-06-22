<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import TripServices from "../services/tripServices.js";
import TripPeopleRoleServices from "../services/tripPeopleRoleServices.js";
import DonationServices from "../services/donationServices.js";
import AddTripParticipantDialog from "../components/AddTripParticipantDialog.vue";
import EditTripParticipantDialog from "../components/EditTripParticipantDialog.vue";
import ParticipantDonationsDialog from "../components/ParticipantDonationsDialog.vue";
import EditTripDialog from "../components/EditTripDialog.vue";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";
import { countryName } from "../utils/locationData.js";

const route = useRoute();
const router = useRouter();

const tripId = computed(() => route.params.tripId);
const trip = ref(null);
const participants = ref([]);
const donations = ref([]);
const loading = ref(false);
const message = ref("");
const showAddParticipant = ref(false);
const showEditParticipant = ref(false);
const editParticipant = ref(null);
const showEditTrip = ref(false);
const showDonations = ref(false);
const donationsParticipant = ref(null);

const donorLink = computed(() => `/donate/trip/${tripId.value}`);

const formatLeaders = computed(() => (trip.value?.leaderNames || []).join(", ") || "—");

const participantCount = computed(() => participants.value.length);

const sumDonations = (rows) =>
  rows.reduce((total, row) => total + Number(row.amount || 0), 0);

const totalDonations = computed(() => sumDonations(donations.value));

const unassignedDonations = computed(() =>
  sumDonations(donations.value.filter((row) => row.personId == null))
);

const formatDate = (value) => value || "—";

const participantName = (row) => {
  const p = row.person;
  return p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() : "—";
};

const loadTrip = () =>
  TripServices.get(tripId.value).then((r) => {
    trip.value = r.data || null;
  });

const loadParticipants = () =>
  TripPeopleRoleServices.getAll(tripId.value).then((r) => {
    participants.value = r.data || [];
  });

const loadDonations = () =>
  DonationServices.getAll(tripId.value).then((r) => {
    donations.value = r.data || [];
  });

const refresh = async () => {
  loading.value = true;
  message.value = "";
  try {
    await Promise.all([loadTrip(), loadParticipants(), loadDonations()]);
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to load trip.";
  } finally {
    loading.value = false;
  }
};

const openDonations = (row) => {
  donationsParticipant.value = row;
  showDonations.value = true;
};

const openEdit = (row) => {
  editParticipant.value = row;
  showEditParticipant.value = true;
};

const onParticipantAdded = () => {
  message.value = "Participant added.";
  loadParticipants();
};

const onParticipantUpdated = () => {
  message.value = "Participant updated.";
  loadParticipants();
};

const formatDonationTotal = (row) => formatMoneyDisplay(row.donationTotal ?? 0) || "$0.00";

const formatParticipantCost = (value) =>
  value != null ? formatMoneyDisplay(value) : "—";

const rowParticipantCost = (row) =>
  formatParticipantCost(row.participantCost ?? trip.value?.participantCost);

const onDonationsChanged = () => {
  loadParticipants();
  loadDonations();
};

const onTripUpdated = () => {
  message.value = "Trip updated.";
  refresh();
};

onMounted(refresh);
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center ga-2">
        <v-btn variant="text" @click="router.push({ name: 'trips' })">Back to trips</v-btn>
        <h1 class="text-h5">{{ trip?.name || "Trip" }}</h1>
      </div>
      <v-btn v-if="trip" variant="tonal" @click="showEditTrip = true">Edit trip</v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-card v-if="trip" class="pa-4 mb-6">
      <v-card-title class="px-0 pt-0">{{ trip.name }}</v-card-title>
      <v-card-subtitle class="px-0">
        {{ trip.organization?.name || "Organization" }}
        <span v-if="trip.city || trip.country"> · {{ [trip.city, countryName(trip.country)].filter(Boolean).join(", ") }}</span>
      </v-card-subtitle>
      <v-card-text class="px-0">
        <v-row dense>
          <v-col cols="12" sm="6" md="4"><strong>Status:</strong> {{ trip.status }}</v-col>
          <v-col cols="12" sm="6" md="4">
            <strong>Dates:</strong> {{ formatDate(trip.startDate) }} – {{ formatDate(trip.endDate) }}
          </v-col>
          <v-col cols="12" sm="6" md="4"><strong>Location:</strong> {{ trip.location || "—" }}</v-col>
          <v-col cols="12" sm="6" md="4"><strong>Leaders:</strong> {{ formatLeaders }}</v-col>
          <v-col cols="12" sm="6" md="4">
            <strong>Participant cost:</strong> {{ formatParticipantCost(trip.participantCost) }}
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <strong>Donor page:</strong>
            <a :href="donorLink" target="_blank">Open public donate page</a>
          </v-col>
        </v-row>
        <p v-if="trip.description" class="mt-3 mb-0">{{ trip.description }}</p>
      </v-card-text>
    </v-card>

    <v-card v-if="trip" variant="tonal" class="mb-6 pa-4">
      <v-row dense>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Participants</div>
          <div class="text-body-1">{{ participantCount }}</div>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Cost per participant</div>
          <div class="text-body-1">{{ formatParticipantCost(trip.participantCost) }}</div>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Total donations</div>
          <div class="text-body-1">{{ formatMoneyDisplay(totalDonations) || "$0.00" }}</div>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Donations without participant</div>
          <div class="text-body-1">{{ formatMoneyDisplay(unassignedDonations) || "$0.00" }}</div>
        </v-col>
      </v-row>
    </v-card>

    <div class="d-flex align-center justify-space-between mb-3">
      <h2 class="text-h6">Participants</h2>
      <v-btn color="primary" size="small" :disabled="!trip" @click="showAddParticipant = true">
        Add participant
      </v-btn>
    </div>

    <v-data-table
      :items="participants"
      :loading="loading"
      :headers="[
        { title: 'Name', key: 'name' },
        { title: 'Role', key: 'role' },
        { title: 'Status', key: 'status' },
        { title: 'Participant cost', key: 'participantCost' },
        { title: 'Total donations', key: 'donationTotal' },
        { title: 'Why go', key: 'whygoText' },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.name="{ item }">{{ participantName(item) }}</template>
      <template #item.role="{ item }">{{ item.role?.roleName || "—" }}</template>
      <template #item.participantCost="{ item }">{{ rowParticipantCost(item) }}</template>
      <template #item.donationTotal="{ item }">{{ formatDonationTotal(item) }}</template>
      <template #item.whygoText="{ item }">{{ item.whygoText || "—" }}</template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" @click="openEdit(item)">Edit</v-btn>
        <v-btn size="small" variant="text" @click="openDonations(item)">View donations</v-btn>
      </template>
    </v-data-table>

    <AddTripParticipantDialog
      v-model="showAddParticipant"
      :trip-id="tripId"
      @saved="onParticipantAdded"
    />
    <EditTripParticipantDialog
      v-model="showEditParticipant"
      :participant="editParticipant"
      @saved="onParticipantUpdated"
    />
    <ParticipantDonationsDialog
      v-model="showDonations"
      :trip-id="tripId"
      :participant="donationsParticipant"
      @changed="onDonationsChanged"
    />
    <EditTripDialog v-model="showEditTrip" :trip-id="tripId" @saved="onTripUpdated" />
  </v-container>
</template>
