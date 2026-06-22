<script setup>
import { ref, computed, watch } from "vue";
import DonationServices from "../services/donationServices.js";
import DonationFormDialog from "./DonationFormDialog.vue";
import { formatDonorName } from "../utils/donorUtils.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tripId: { type: [Number, String], required: true },
  participant: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue", "changed"]);

const donations = ref([]);
const loading = ref(false);
const message = ref("");
const showDonationForm = ref(false);
const editingDonation = ref(null);

const participantName = computed(() => {
  const p = props.participant?.person;
  return p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() : "";
});

const personId = computed(() => props.participant?.person?.id ?? props.participant?.peopleId ?? null);

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

const formatAmount = (value) => `$${Number(value || 0).toFixed(2)}`;

const donorName = (item) => formatDonorName(item.donor);

const loadDonations = () => {
  if (!props.tripId || !personId.value) return;
  loading.value = true;
  message.value = "";
  DonationServices.getAll(props.tripId, { personId: personId.value })
    .then((r) => {
      donations.value = r.data || [];
    })
    .catch((e) => {
      message.value = e.response?.data?.message || "Unable to load donations.";
    })
    .finally(() => {
      loading.value = false;
    });
};

watch(
  () => [props.modelValue, props.participant],
  ([open]) => {
    if (open) loadDonations();
  }
);

const close = () => emit("update:modelValue", false);

const openAddDonation = () => {
  editingDonation.value = null;
  showDonationForm.value = true;
};

const openEditDonation = (row) => {
  editingDonation.value = row;
  showDonationForm.value = true;
};

const onDonationSaved = () => {
  message.value = "Donation saved.";
  loadDonations();
  emit("changed");
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="720" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Donations for {{ participantName }}</v-card-title>
      <v-card-text style="max-height: 70vh">
        <div class="d-flex justify-end mb-3">
          <v-btn color="primary" size="small" @click="openAddDonation">Add donation</v-btn>
        </div>

        <v-progress-linear v-if="loading" indeterminate class="mb-3" />

        <v-data-table
          v-else
          :items="donations"
          :headers="[
            { title: 'Date', key: 'dateTime' },
            { title: 'Donor', key: 'donor' },
            { title: 'Amount', key: 'amount' },
            { title: 'Actions', key: 'actions', sortable: false },
          ]"
          density="compact"
        >
          <template #item.dateTime="{ item }">{{ formatDate(item.dateTime) }}</template>
          <template #item.donor="{ item }">{{ donorName(item) }}</template>
          <template #item.amount="{ item }">{{ formatAmount(item.amount) }}</template>
          <template #item.actions="{ item }">
            <v-btn size="small" variant="text" @click="openEditDonation(item)">Edit</v-btn>
          </template>
        </v-data-table>

        <v-alert v-if="message" type="info" density="compact" class="mt-3">{{ message }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <DonationFormDialog
    v-model="showDonationForm"
    :trip-id="tripId"
    :person-id="personId"
    :donation="editingDonation"
    @saved="onDonationSaved"
  />
</template>
