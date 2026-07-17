<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import TripServices from "../services/tripServices.js";
import DonorTripHeading from "../components/DonorTripHeading.vue";
import ApplyTripDialog from "../components/ApplyTripDialog.vue";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";

const props = defineProps({
  tripId: { type: [String, Number], required: true },
});

const router = useRouter();
const trip = ref(null);
const rolesNeeded = ref([]);
const alreadyApplied = ref(false);
const applicationStatus = ref(null);
const loading = ref(false);
const message = ref("");
const messageType = ref("info");
const showApplyDialog = ref(false);

const applyLabel = computed(() => {
  if (applicationStatus.value === "active") return "Joined";
  if (alreadyApplied.value) return "Applied";
  return "Apply";
});

const load = async () => {
  loading.value = true;
  message.value = "";
  try {
    const res = await TripServices.getBrowseTrip(props.tripId);
    trip.value = res.data?.trip || null;
    rolesNeeded.value = res.data?.rolesNeeded || [];
    alreadyApplied.value = !!res.data?.alreadyApplied;
    applicationStatus.value = res.data?.applicationStatus || null;
  } catch (e) {
    messageType.value = "error";
    message.value = e.response?.data?.message || "Unable to load trip.";
    trip.value = null;
    rolesNeeded.value = [];
  } finally {
    loading.value = false;
  }
};

const openApply = () => {
  if (alreadyApplied.value) return;
  showApplyDialog.value = true;
};

const onApplicationSaved = () => {
  messageType.value = "success";
  message.value = "Application submitted. Your organization will review it.";
  load();
};

onMounted(load);
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
      <v-btn variant="text" @click="router.push({ name: 'home' })">Back to dashboard</v-btn>
      <v-btn color="primary" :disabled="alreadyApplied || !trip" @click="openApply">
        {{ applyLabel }}
      </v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />
    <v-alert v-if="message" :type="messageType" density="compact" class="mb-4">{{ message }}</v-alert>

    <DonorTripHeading :trip="trip" />

    <v-card v-if="trip" class="pa-4 mb-4" variant="outlined">
      <v-row dense>
        <v-col cols="12" sm="6" md="4">
          <div class="text-caption text-medium-emphasis">Location</div>
          <div>{{ trip.location || "—" }}</div>
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <div class="text-caption text-medium-emphasis">Participant cost</div>
          <div>
            {{ trip.participantCost != null ? formatMoneyDisplay(trip.participantCost) : "—" }}
          </div>
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <div class="text-caption text-medium-emphasis">Status</div>
          <div>{{ trip.status }}</div>
        </v-col>
      </v-row>
    </v-card>

    <v-card v-if="trip" class="pa-4">
      <h2 class="text-h6 mb-3">Team roles needed</h2>
      <v-table v-if="rolesNeeded.length" density="compact">
        <thead>
          <tr>
            <th>Role</th>
            <th>Number Needed</th>
            <th>Positions Filled</th>
            <th>Available</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rolesNeeded" :key="row.id">
            <td>
              <div>{{ row.workerRole?.name || "—" }}</div>
              <div v-if="row.workerRole?.description" class="text-caption text-medium-emphasis">
                {{ row.workerRole.description }}
              </div>
            </td>
            <td>{{ row.quantity ?? 0 }}</td>
            <td>{{ row.signedUpCount ?? 0 }}</td>
            <td>{{ row.availableCount ?? 0 }}</td>
          </tr>
        </tbody>
      </v-table>
      <p v-else class="text-body-2 text-medium-emphasis mb-0">
        No team roles have been listed for this trip yet.
      </p>
    </v-card>

    <ApplyTripDialog
      v-model="showApplyDialog"
      :trip-id="tripId"
      @saved="onApplicationSaved"
    />
  </v-container>
</template>
