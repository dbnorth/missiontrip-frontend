<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import PublicServices from "../services/publicServices.js";
import DonorTripHeading from "../components/DonorTripHeading.vue";
import PublicApplyFlow from "../components/PublicApplyFlow.vue";
import { toUrlSlug, donorTripPath, orgPublicRoute } from "../utils/donateUrls.js";

const props = defineProps({
  tripSlug: { type: String, required: true },
});

const router = useRouter();
const loading = ref(false);
const message = ref("");
const trip = ref(null);
const rolesNeeded = ref([]);
const applyFlow = ref(null);

const orgBackRoute = computed(() => {
  const org = trip.value?.organization;
  if (!org?.name) return null;
  return orgPublicRoute(org);
});

const organizationId = computed(
  () => trip.value?.orgId ?? trip.value?.organization?.id ?? null
);

const organizationName = computed(() => trip.value?.organization?.name || "");

const positionsLabel = (role) => {
  const available = Number(role?.availableCount) || 0;
  if (available < 1) return "Filled";
  return `${available} needed`;
};

const load = async () => {
  if (!props.tripSlug) return;
  loading.value = true;
  message.value = "";
  try {
    const res = await PublicServices.getTripOverviewBySlug(props.tripSlug);
    trip.value = res.data?.trip || null;
    rolesNeeded.value = res.data?.rolesNeeded || [];
    const expectedSlug = toUrlSlug(trip.value?.name);
    if (expectedSlug && props.tripSlug !== expectedSlug) {
      router.replace({ name: "publicTrip", params: { tripSlug: expectedSlug } });
    }
  } catch (e) {
    trip.value = null;
    rolesNeeded.value = [];
    message.value = e.response?.data?.message || "Unable to load trip.";
  } finally {
    loading.value = false;
  }
};

const openApply = () => {
  applyFlow.value?.openForTrip(trip.value);
};

watch(() => props.tripSlug, load);
onMounted(load);
</script>

<template>
  <v-container class="py-8">
    <v-btn
      v-if="orgBackRoute"
      variant="text"
      class="mb-4 px-0"
      :to="orgBackRoute"
    >
      ← Back to organization
    </v-btn>

    <v-progress-linear v-if="loading" indeterminate class="mb-6" />
    <v-alert
      v-if="message"
      type="error"
      density="compact"
      class="mb-4"
      closable
      @click:close="message = ''"
    >
      {{ message }}
    </v-alert>

    <DonorTripHeading :trip="trip" />

    <template v-if="trip">
      <div class="d-flex flex-wrap ga-2 mb-6">
        <v-btn color="primary" variant="flat" :to="donorTripPath(trip)">Donate</v-btn>
        <v-btn variant="tonal" @click="openApply">Apply</v-btn>
      </div>

      <h2 class="text-h6 font-weight-bold mb-3">Roles needed</h2>
      <v-alert v-if="!rolesNeeded.length" type="info" density="compact">
        No roles have been posted for this trip yet.
      </v-alert>
      <v-table v-else density="compact">
        <thead>
          <tr>
            <th>Role</th>
            <th class="text-right">Positions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="role in rolesNeeded" :key="role.id">
            <td>
              <div class="font-weight-medium">{{ role.workerRole?.name || "Role" }}</div>
              <div v-if="role.workerRole?.description" class="text-caption text-medium-emphasis">
                {{ role.workerRole.description }}
              </div>
            </td>
            <td class="text-right">{{ positionsLabel(role) }}</td>
          </tr>
        </tbody>
      </v-table>
    </template>

    <PublicApplyFlow
      ref="applyFlow"
      :organization-id="organizationId"
      :organization-name="organizationName"
    />
  </v-container>
</template>
