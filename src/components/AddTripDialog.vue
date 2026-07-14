<script setup>
import { ref, computed, watch } from "vue";
import TripServices from "../services/tripServices.js";
import OrganizationServices from "../services/organizationServices.js";
import Utils from "../config/utils.js";
import { useTripLeaderPicker } from "../utils/useTripLeaderPicker.js";
import MoneyInput from "./MoneyInput.vue";
import CountrySelect from "./CountrySelect.vue";
import { parseMoneyAmount } from "../utils/moneyUtils.js";
import { resolveCountryCode } from "../utils/locationData.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const STATUS_OPTIONS = ["active", "completed", "inactive"];

const user = ref(null);
const organizations = ref([]);
const formError = ref("");
const saving = ref(false);
const imageFile = ref(null);
const imagePreview = ref(null);

const emptyForm = () => ({
  name: "",
  status: "active",
  location: "",
  city: "",
  country: "",
  description: "",
  startDate: "",
  endDate: "",
  facebookPage: "",
  instagramId: "",
  participantCost: "",
  orgId: null,
});

const form = ref(emptyForm());

const {
  leaderPeopleIds,
  leaderOptions,
  leadersLoading,
  leadersError,
  personLabel,
  loadLeaderOptions,
  resetLeaders,
} = useTripLeaderPicker();

const isSystemAdmin = computed(() => Utils.isSystemAdmin(user.value));

const orgAdminOrgs = computed(() =>
  (user.value?.orgRoles || []).filter((r) => r.roleName === "Org Admin")
);

const orgAdminOrgItems = computed(() =>
  orgAdminOrgs.value.map((r) => ({ title: r.orgName, value: r.orgId }))
);

const selectedOrgAdminOrg = computed(() =>
  orgAdminOrgs.value.find((r) => Number(r.orgId) === Number(form.value.orgId))
);

const clearImageSelection = () => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
  imageFile.value = null;
  imagePreview.value = null;
};

const onImageSelected = (files) => {
  const file = Array.isArray(files) ? files[0] : files;
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
  imageFile.value = file || null;
  imagePreview.value = file ? URL.createObjectURL(file) : null;
};

const resetForm = () => {
  user.value = Utils.getStore("user");
  const defaultOrgId = isSystemAdmin.value
    ? Utils.effectiveOrgId(user.value)
    : Utils.effectiveOrgId(user.value) ?? orgAdminOrgs.value[0]?.orgId ?? null;

  form.value = { ...emptyForm(), orgId: defaultOrgId };
  formError.value = "";
  clearImageSelection();
  resetLeaders();
  if (defaultOrgId) loadLeaderOptions(defaultOrgId);
};

const loadOptions = async () => {
  user.value = Utils.getStore("user");
  if (isSystemAdmin.value) {
    const orgRes = await OrganizationServices.getAll();
    organizations.value = orgRes.data || [];
  }
  resetForm();
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) loadOptions();
  }
);

watch(
  () => form.value.orgId,
  (orgId) => {
    if (props.modelValue) loadLeaderOptions(orgId);
  }
);

const close = () => {
  clearImageSelection();
  emit("update:modelValue", false);
};

const save = async () => {
  if (!form.value.name?.trim()) {
    formError.value = "Trip name is required.";
    return;
  }
  if (!form.value.orgId) {
    formError.value = "Organization is required.";
    return;
  }

  saving.value = true;
  formError.value = "";

  const payload = {
    orgId: form.value.orgId,
    name: form.value.name.trim(),
    status: form.value.status,
    location: form.value.location?.trim() || null,
    city: form.value.city?.trim() || null,
    country: resolveCountryCode(form.value.country) || null,
    description: form.value.description?.trim() || null,
    startDate: form.value.startDate || null,
    endDate: form.value.endDate || null,
    facebookPage: form.value.facebookPage?.trim() || null,
    instagramId: form.value.instagramId?.trim() || null,
    participantCost: parseMoneyAmount(form.value.participantCost),
    leaderPeopleIds: leaderPeopleIds.value,
  };

  try {
    const res = await TripServices.create(payload);
    const trip = res.data;
    if (imageFile.value && trip?.id) {
      await TripServices.uploadImage(trip.id, imageFile.value);
    }
    emit("saved");
    close();
  } catch (e) {
    formError.value = e.response?.data?.message || "Error saving trip.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="560" @update:model-value="(v) => !v && close()">
    <v-card class="pa-4">
      <v-card-title>Add trip</v-card-title>

      <v-card-text>
        <v-text-field v-model="form.name" label="Name" density="compact" autocomplete="off" />

        <v-select
          v-model="form.status"
          :items="STATUS_OPTIONS"
          label="Status"
          density="compact"
        />

        <template v-if="isSystemAdmin">
          <v-select
            v-model="form.orgId"
            :items="organizations"
            item-title="name"
            item-value="id"
            label="Organization"
            density="compact"
          />
        </template>

        <template v-else>
          <v-select
            v-if="orgAdminOrgs.length > 1"
            v-model="form.orgId"
            :items="orgAdminOrgItems"
            label="Organization"
            density="compact"
          />
          <v-text-field
            v-else
            :model-value="selectedOrgAdminOrg?.orgName || orgAdminOrgs[0]?.orgName"
            label="Organization"
            density="compact"
            readonly
          />
        </template>

        <v-text-field v-model="form.location" label="Location" density="compact" autocomplete="off" />
        <v-text-field v-model="form.city" label="City" density="compact" autocomplete="off" />
        <CountrySelect v-model="form.country" />

        <v-row dense>
          <v-col cols="6">
            <v-text-field v-model="form.startDate" label="Start date" type="date" density="compact" />
          </v-col>
          <v-col cols="6">
            <v-text-field v-model="form.endDate" label="End date" type="date" density="compact" />
          </v-col>
        </v-row>

        <MoneyInput v-model="form.participantCost" label="Participant cost" class="mb-2" />

        <v-textarea
          v-model="form.description"
          label="Description"
          density="compact"
          rows="3"
          auto-grow
        />

        <v-text-field
          v-model="form.facebookPage"
          label="Facebook page URL"
          density="compact"
          autocomplete="off"
        />
        <v-text-field
          v-model="form.instagramId"
          label="Instagram ID"
          density="compact"
          autocomplete="off"
        />

        <div class="mt-2 mb-2">
          <div class="text-subtitle-2 mb-2">Trip image</div>
          <div class="d-flex align-center ga-3 mb-2">
            <v-img
              v-if="imagePreview"
              :src="imagePreview"
              alt="Trip image preview"
              max-width="160"
              max-height="100"
              cover
            />
            <span v-else class="text-caption text-medium-emphasis">Optional</span>
          </div>
          <v-file-input
            label="Upload trip image"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            density="compact"
            prepend-icon="mdi-camera"
            show-size
            clearable
            hide-details
            @update:model-value="onImageSelected"
          />
        </div>

        <v-autocomplete
          v-model="leaderPeopleIds"
          :items="leaderOptions"
          :item-title="personLabel"
          item-value="id"
          label="Trip leaders"
          density="compact"
          multiple
          chips
          closable-chips
          clearable
          :loading="leadersLoading"
          :disabled="!form.orgId"
          :hint="
            !form.orgId
              ? 'Select an organization first'
              : leaderOptions.length
                ? 'People with the Trip Leader role for this organization'
                : 'No Trip Leaders are assigned to this organization yet'
          "
          persistent-hint
          class="mt-2"
        />

        <v-alert v-if="leadersError" type="error" density="compact" class="mt-2">{{ leadersError }}</v-alert>
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Add</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
