<script setup>
import { ref, onMounted } from "vue";
import PublicServices from "../services/publicServices.js";

const props = defineProps({
  tripId: { type: [String, Number], required: true },
  personId: { type: [String, Number], required: true },
});

const trip = ref(null);
const participant = ref(null);
const whygoText = ref("");
const donationTotal = ref(0);
const message = ref("");
const success = ref(false);
const donor = ref({ firstName: "", lastName: "", email: "" });
const amount = ref("");

const load = () => {
  PublicServices.getParticipant(props.tripId, props.personId).then((r) => {
    trip.value = r.data.trip;
    participant.value = r.data.participant;
    whygoText.value = r.data.whygoText;
    donationTotal.value = r.data.donationTotal;
  });
};

const donate = () => {
  PublicServices.donate({
    tripId: Number(props.tripId),
    personId: Number(props.personId),
    amount: Number(amount.value),
    donor: donor.value,
  })
    .then(() => {
      success.value = true;
      message.value = "Thank you for supporting this participant!";
    })
    .catch((e) => {
      message.value = e.response?.data?.message || "Donation failed.";
    });
};

onMounted(load);
</script>

<template>
  <v-container>
    <v-card v-if="participant" class="pa-4 mb-4">
      <v-card-title>{{ participant.firstName }} {{ participant.lastName }}</v-card-title>
      <v-card-subtitle v-if="trip">{{ trip.name }}</v-card-subtitle>
      <v-card-text>
        <p v-if="whygoText">{{ whygoText }}</p>
        <p v-if="participant.bioText">{{ participant.bioText }}</p>
        <p>Raised so far: ${{ Number(donationTotal).toFixed(2) }}</p>
      </v-card-text>
    </v-card>

    <v-alert v-if="message" :type="success ? 'success' : 'error'" class="mb-4">{{ message }}</v-alert>

    <v-card v-if="!success" class="pa-4">
      <v-card-title>Support {{ participant?.firstName }}</v-card-title>
      <v-text-field v-model="donor.firstName" label="Your first name" density="compact" />
      <v-text-field v-model="donor.lastName" label="Your last name" density="compact" />
      <v-text-field v-model="donor.email" label="Email" density="compact" />
      <v-text-field v-model="amount" label="Amount" type="number" density="compact" />
      <v-btn color="primary" @click="donate">Donate</v-btn>
    </v-card>
  </v-container>
</template>
