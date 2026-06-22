<script setup>
import { ref, onMounted } from "vue";
import PublicServices from "../services/publicServices.js";
import { countryName } from "../utils/locationData.js";

const props = defineProps({ tripId: { type: [String, Number], required: true } });

const trip = ref(null);
const participants = ref([]);
const message = ref("");
const success = ref(false);
const donor = ref({ firstName: "", lastName: "", email: "", city: "" });
const amount = ref("");
const selectedPersonId = ref(null);

const load = () => {
  PublicServices.getTrip(props.tripId).then((r) => {
    trip.value = r.data.trip;
    participants.value = r.data.participants || [];
  });
};

const donate = () => {
  PublicServices.donate({
    tripId: Number(props.tripId),
    personId: selectedPersonId.value,
    amount: Number(amount.value),
    donor: donor.value,
  })
    .then(() => {
      success.value = true;
      message.value = "Thank you for your donation!";
    })
    .catch((e) => {
      message.value = e.response?.data?.message || "Donation failed.";
    });
};

onMounted(load);
</script>

<template>
  <v-container>
    <v-card v-if="trip" class="pa-4 mb-4">
      <v-card-title>{{ trip.name }}</v-card-title>
      <v-card-subtitle>{{ trip.city }}{{ trip.city && trip.country ? ", " : "" }}{{ countryName(trip.country) }}</v-card-subtitle>
      <v-card-text>{{ trip.description }}</v-card-text>
    </v-card>

    <v-alert v-if="message" :type="success ? 'success' : 'error'" class="mb-4">{{ message }}</v-alert>

    <v-card v-if="!success" class="pa-4">
      <v-card-title>Make a donation</v-card-title>
      <v-select
        v-model="selectedPersonId"
        :items="participants"
        :item-title="(p) => `${p.person?.firstName} ${p.person?.lastName}`"
        :item-value="(p) => p.person?.id"
        label="Support a participant (optional)"
        clearable
        density="compact"
      />
      <v-text-field v-model="donor.firstName" label="Your first name" density="compact" />
      <v-text-field v-model="donor.lastName" label="Your last name" density="compact" />
      <v-text-field v-model="donor.email" label="Email" density="compact" />
      <v-text-field v-model="amount" label="Amount" type="number" density="compact" />
      <v-btn color="primary" @click="donate">Donate</v-btn>
    </v-card>

    <v-list v-if="participants.length" class="mt-4">
      <v-list-subheader>Or donate to a specific participant</v-list-subheader>
      <v-list-item
        v-for="p in participants"
        :key="p.person?.id"
        :to="{ name: 'donorParticipant', params: { tripId, personId: p.person?.id } }"
        :title="`${p.person?.firstName} ${p.person?.lastName}`"
      />
    </v-list>
  </v-container>
</template>
