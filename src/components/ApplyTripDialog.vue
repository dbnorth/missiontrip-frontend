<script setup>
import { ref, computed, watch } from "vue";
import TripServices from "../services/tripServices.js";
import PersonServices from "../services/personServices.js";
import PersonDocumentServices from "../services/personDocumentServices.js";
import Utils from "../config/utils.js";
import DonorTripHeading from "./DonorTripHeading.vue";
import ParticipantAgreementSection from "./ParticipantAgreementSection.vue";
import TripApplicationTravelOptions from "./TripApplicationTravelOptions.vue";
import { getMissingProfileFields, isProfileComplete, isUnder18 } from "../utils/personProfile.js";
import { isApplicationFormComplete } from "../utils/tripApplicationForm.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tripId: { type: [Number, String], default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const loading = ref(false);
const saving = ref(false);
const formError = ref("");
const trip = ref(null);
const rolesNeeded = ref([]);
const personDocuments = ref([]);
const person = ref(null);
const agreementContent = ref("");
const travelOptions = ref([]);
const selectedTravelOptionIds = ref([]);
const travelOptionsRef = ref(null);

const form = ref({
  tripWorkerRoleId: null,
  willSelfFund: false,
  willRaiseFunds: false,
  licenseStatus: null,
  hasPreferredRoommate: false,
  preferredRoommateNames: "",
  agreementAccepted: false,
  agreementSignatureName: "",
  agreementAdultFirstName: "",
  agreementAdultLastName: "",
  agreementAdultEmail: "",
  agreementAdultRelationship: "",
});

const agreementRequired = computed(() => !!agreementContent.value?.trim());
const participantUnder18 = computed(() => isUnder18(person.value?.birthDate));

const availableRoles = computed(() =>
  (rolesNeeded.value || []).filter((r) => (r.availableCount || 0) > 0)
);

const roleItems = computed(() =>
  availableRoles.value.map((r) => ({
    title: `${r.workerRole?.name || "Role"} (${r.availableCount} available)`,
    value: r.id,
    raw: r,
  }))
);

const selectedRole = computed(() =>
  availableRoles.value.find((r) => Number(r.id) === Number(form.value.tripWorkerRoleId)) || null
);

const licenseRequired = computed(() => !!selectedRole.value?.workerRole?.licenseRequired);
const requiredDocumentType = computed(
  () => selectedRole.value?.workerRole?.documentType || null
);
const licenseType = computed(() => requiredDocumentType.value?.description || "");

const licenseItems = [
  { title: "Yes", value: "yes" },
  { title: "Yes, retired", value: "yes_retired" },
  { title: "No", value: "no" },
];

const licenseLabel = computed(() =>
  licenseType.value
    ? `Do you have a ${licenseType.value} license for this role?`
    : "Do you have a license for this role?"
);

const dateOnly = (value) => {
  if (!value) return null;
  return String(value).slice(0, 10);
};

const hasRequiredDocumentForTrip = computed(() => {
  const docTypeId = selectedRole.value?.workerRole?.documentTypeId;
  if (!docTypeId) return true;

  // Prefer trip end date (approval requirement); fall back to start date.
  const compareDate = dateOnly(trip.value?.endDate) || dateOnly(trip.value?.startDate);
  if (!compareDate) return true;

  return personDocuments.value.some((doc) => {
    if (Number(doc.documentTypeId) !== Number(docTypeId)) return false;
    const expirationDate = dateOnly(doc.expirationDate);
    // Must expire after the trip ends (past the end of the trip).
    return expirationDate && expirationDate > compareDate;
  });
});

const documentRequirementWarning = computed(() => {
  if (!licenseRequired.value || !requiredDocumentType.value) return "";
  if (hasRequiredDocumentForTrip.value) return "";

  const docName = requiredDocumentType.value.description || "required document";
  const endDate = dateOnly(trip.value?.endDate);
  const endPart = endDate ? ` (${endDate})` : "";
  return `For your application to be approved, you will need to upload a ${docName} with an expiration date past the end of the trip${endPart}.`;
});

const profileComplete = computed(() => isProfileComplete(person.value));
const missingProfileFields = computed(() => getMissingProfileFields(person.value));

const applicationFormComplete = computed(() =>
  isApplicationFormComplete({
    tripWorkerRoleId: form.value.tripWorkerRoleId,
    willSelfFund: form.value.willSelfFund,
    willRaiseFunds: form.value.willRaiseFunds,
    licenseRequired: licenseRequired.value,
    licenseStatus: form.value.licenseStatus,
    hasPreferredRoommate: form.value.hasPreferredRoommate,
    preferredRoommateNames: form.value.preferredRoommateNames,
  })
);

const canAgreeToAgreement = computed(
  () => profileComplete.value && applicationFormComplete.value
);

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const resetForm = () => {
  form.value = {
    tripWorkerRoleId: null,
    willSelfFund: false,
    willRaiseFunds: false,
    licenseStatus: null,
    hasPreferredRoommate: false,
    preferredRoommateNames: "",
    agreementAccepted: false,
    agreementSignatureName: "",
    agreementAdultFirstName: "",
    agreementAdultLastName: "",
    agreementAdultEmail: "",
    agreementAdultRelationship: "",
  };
  selectedTravelOptionIds.value = [];
  formError.value = "";
};

const loadPersonDocuments = async () => {
  const personId = Utils.getStore("user")?.personId;
  if (!personId) {
    personDocuments.value = [];
    return;
  }
  try {
    const res = await PersonDocumentServices.getAll(personId);
    personDocuments.value = res.data || [];
  } catch {
    personDocuments.value = [];
  }
};

const loadPerson = async () => {
  const personId = Utils.getStore("user")?.personId;
  if (!personId) {
    person.value = null;
    return;
  }
  try {
    const res = await PersonServices.get(personId);
    person.value = res.data || null;
  } catch {
    person.value = null;
  }
};

const load = async () => {
  if (!props.tripId) return;
  loading.value = true;
  formError.value = "";
  resetForm();
  try {
    const [res] = await Promise.all([
      TripServices.getBrowseTrip(props.tripId),
      loadPersonDocuments(),
      loadPerson(),
    ]);
    trip.value = res.data?.trip || null;
    rolesNeeded.value = res.data?.rolesNeeded || [];
    travelOptions.value = res.data?.travelOptions || [];
    selectedTravelOptionIds.value = (res.data?.travelOptions || [])
      .filter((o) => o.selected)
      .map((o) => Number(o.id));
    agreementContent.value = res.data?.participantAgreement?.exists
      ? res.data.participantAgreement.content || ""
      : "";
    if (res.data?.alreadyApplied) {
      const status = res.data?.applicationStatus;
      formError.value =
        status === "approved"
          ? "You are already on this trip."
          : status === "incomplete" || status === "ready"
            ? "You have already applied to this trip."
            : status
              ? `Your previous application for this trip is ${status}.`
              : "You have already applied to this trip.";
    }
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load trip.";
    trip.value = null;
    rolesNeeded.value = [];
    personDocuments.value = [];
    travelOptions.value = [];
    selectedTravelOptionIds.value = [];
    agreementContent.value = "";
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.modelValue, props.tripId],
  ([visible]) => {
    if (visible && props.tripId) load();
    if (!visible) {
      trip.value = null;
      rolesNeeded.value = [];
      personDocuments.value = [];
      person.value = null;
      travelOptions.value = [];
      selectedTravelOptionIds.value = [];
      agreementContent.value = "";
      resetForm();
    }
  }
);

watch(
  () => form.value.tripWorkerRoleId,
  () => {
    if (!licenseRequired.value) form.value.licenseStatus = null;
  }
);

watch(
  () => form.value.hasPreferredRoommate,
  (has) => {
    if (!has) form.value.preferredRoommateNames = "";
  }
);

const close = () => {
  open.value = false;
};

const save = async () => {
  formError.value = "";
  if (!form.value.tripWorkerRoleId) {
    formError.value = "Select a trip role with available positions.";
    return;
  }
  if (form.value.hasPreferredRoommate && !form.value.preferredRoommateNames?.trim()) {
    formError.value = "Enter preferred roommate name(s).";
    return;
  }
  const travelOptionsError = travelOptionsRef.value?.validate?.();
  if (travelOptionsError) {
    formError.value = travelOptionsError;
    return;
  }
  if (agreementRequired.value && form.value.agreementAccepted) {
    if (!form.value.agreementSignatureName?.trim()) {
      formError.value = participantUnder18.value
        ? "Enter the adult's name as the electronic signature."
        : "Enter your name as your electronic signature.";
      return;
    }
    if (participantUnder18.value) {
      if (!form.value.agreementAdultFirstName?.trim()) {
        formError.value = "Enter the adult signer's first name.";
        return;
      }
      if (!form.value.agreementAdultLastName?.trim()) {
        formError.value = "Enter the adult signer's last name.";
        return;
      }
      if (!form.value.agreementAdultEmail?.trim()) {
        formError.value = "Enter the adult signer's email.";
        return;
      }
      if (!form.value.agreementAdultRelationship?.trim()) {
        formError.value = "Enter the adult's relationship to the participant.";
        return;
      }
    }
  }

  saving.value = true;
  try {
    await TripServices.applyToTrip(props.tripId, {
      tripWorkerRoleId: Number(form.value.tripWorkerRoleId),
      willSelfFund: !!form.value.willSelfFund,
      willRaiseFunds: !!form.value.willRaiseFunds,
      licenseStatus: licenseRequired.value ? form.value.licenseStatus : null,
      hasPreferredRoommate: !!form.value.hasPreferredRoommate,
      preferredRoommateNames: form.value.hasPreferredRoommate
        ? form.value.preferredRoommateNames.trim()
        : null,
      agreementAccepted: agreementRequired.value ? !!form.value.agreementAccepted : false,
      agreementSignatureName: agreementRequired.value
        ? form.value.agreementSignatureName.trim() || null
        : null,
      agreementAdultFirstName:
        agreementRequired.value && participantUnder18.value
          ? form.value.agreementAdultFirstName.trim() || null
          : null,
      agreementAdultLastName:
        agreementRequired.value && participantUnder18.value
          ? form.value.agreementAdultLastName.trim() || null
          : null,
      agreementAdultEmail:
        agreementRequired.value && participantUnder18.value
          ? form.value.agreementAdultEmail.trim() || null
          : null,
      agreementAdultRelationship:
        agreementRequired.value && participantUnder18.value
          ? form.value.agreementAdultRelationship.trim() || null
          : null,
      selectedTravelOptionIds: selectedTravelOptionIds.value,
    });
    emit("saved");
    close();
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to submit application.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="640" scrollable persistent>
    <v-card>
      <v-card-title>Apply for trip</v-card-title>
      <v-card-text style="max-height: 75vh">
        <v-progress-linear v-if="loading" indeterminate class="mb-4" />

        <template v-if="!loading && trip">
          <DonorTripHeading :trip="trip" />

          <v-alert
            v-if="!profileComplete"
            type="warning"
            density="compact"
            class="mb-3"
          >
            Your profile is incomplete. Update your profile for this application to be marked Ready.
            <ul v-if="missingProfileFields.length" class="mt-2 mb-0">
              <li v-for="field in missingProfileFields" :key="field">{{ field }}</li>
            </ul>
          </v-alert>

          <v-alert
            v-if="!availableRoles.length"
            type="warning"
            density="compact"
            class="mb-3"
          >
            There are no trip roles with available positions right now.
          </v-alert>

          <v-select
            v-model="form.tripWorkerRoleId"
            :items="roleItems"
            label="Trip role"
            density="compact"
            :disabled="!availableRoles.length"
            hint="Only roles with open positions are listed"
            persistent-hint
            class="mb-2"
          />

          <v-alert
            v-if="documentRequirementWarning"
            type="warning"
            density="compact"
            class="mb-3"
          >
            {{ documentRequirementWarning }}
          </v-alert>

          <div class="text-subtitle-2 mb-1 mt-2">Funding</div>
          <v-checkbox
            v-model="form.willSelfFund"
            label="I will self-fund"
            density="compact"
            hide-details
            class="mt-0"
          />
          <v-checkbox
            v-model="form.willRaiseFunds"
            label="I will raise funds"
            density="compact"
            hide-details
            class="mb-2"
          />

          <v-select
            v-if="licenseRequired"
            v-model="form.licenseStatus"
            :items="licenseItems"
            :label="licenseLabel"
            density="compact"
            class="mb-2"
          />

          <div class="text-subtitle-2 mb-1 mt-2">Roommate preference</div>
          <v-checkbox
            v-model="form.hasPreferredRoommate"
            label="I have a preferred roommate"
            density="compact"
            hide-details
            class="mt-0 mb-2"
          />
          <v-text-field
            v-if="form.hasPreferredRoommate"
            v-model="form.preferredRoommateNames"
            label="Preferred roommate name(s)"
            density="compact"
            autocomplete="off"
          />

          <TripApplicationTravelOptions
            ref="travelOptionsRef"
            v-model:selected-ids="selectedTravelOptionIds"
            :base-cost="trip?.participantCost"
            :options="travelOptions"
          />

          <ParticipantAgreementSection
            v-model:agreement-accepted="form.agreementAccepted"
            v-model:agreement-signature-name="form.agreementSignatureName"
            v-model:agreement-adult-first-name="form.agreementAdultFirstName"
            v-model:agreement-adult-last-name="form.agreementAdultLastName"
            v-model:agreement-adult-email="form.agreementAdultEmail"
            v-model:agreement-adult-relationship="form.agreementAdultRelationship"
            :under18="participantUnder18"
            :can-agree="canAgreeToAgreement"
            :content="agreementContent"
          />
        </template>

        <v-alert v-if="formError" type="error" density="compact" class="mt-3">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="saving"
          :disabled="loading || !trip || !availableRoles.length"
          @click="save"
        >
          Submit application
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
