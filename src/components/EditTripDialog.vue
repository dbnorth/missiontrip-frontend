<script setup>
import { ref, computed, watch } from "vue";
import TripServices from "../services/tripServices.js";
import OrganizationServices from "../services/organizationServices.js";
import Utils from "../config/utils.js";
import { useVersionConflictForm } from "../utils/useVersionConflictForm.js";
import { useTripLeaderPicker } from "../utils/useTripLeaderPicker.js";
import MoneyInput from "./MoneyInput.vue";
import CountrySelect from "./CountrySelect.vue";
import { parseMoneyAmount } from "../utils/moneyUtils.js";
import { resolveCountryCode } from "../utils/locationData.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tripId: { type: [Number, String], default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const STATUS_OPTIONS = ["active", "completed", "inactive"];

const user = ref(null);
const organizations = ref([]);
const loading = ref(false);
const saving = ref(false);
const { formError, formNotice, prepareSave, onLoadStart, onLoadSuccess, handleSaveError } =
  useVersionConflictForm();

const emptyForm = () => ({
  id: null,
  orgId: null,
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
  image: null,
  version: 0,
  organization: null,
});

const form = ref(emptyForm());
const imageFile = ref(null);
const imagePreview = ref(null);

const currentImageUrl = computed(() => TripServices.getImageUrl(form.value.image));

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

const {
  leaderPeopleIds,
  leaderOptions,
  leadersLoading,
  leadersError,
  personLabel,
  loadLeaderOptions,
  setLeadersFromTrip,
  resetLeaders,
} = useTripLeaderPicker();

const isSystemAdmin = computed(() => Utils.isSystemAdmin(user.value));

const orgAdminOrgs = computed(() =>
  (user.value?.orgRoles || []).filter((r) => r.roleName === "Org Admin")
);

const orgAdminOrgItems = computed(() =>
  orgAdminOrgs.value.map((r) => ({ title: r.orgName, value: r.orgId }))
);

const orgDisplayName = computed(() => {
  if (form.value.organization?.name) return form.value.organization.name;
  const org = orgAdminOrgs.value.find((r) => Number(r.orgId) === Number(form.value.orgId));
  if (org?.orgName) return org.orgName;
  if (form.value.orgId) {
    return Utils.orgDisplayName(user.value, form.value.orgId) || "";
  }
  return organizations.value.find((o) => o.id === form.value.orgId)?.name || "";
});

const applyTripData = (data) => {
  form.value = {
    ...emptyForm(),
    ...data,
    country: resolveCountryCode(data.country),
    startDate: data.startDate || "",
    endDate: data.endDate || "",
    participantCost: data.participantCost != null ? String(data.participantCost) : "",
  };
  clearImageSelection();
};

const loadTrip = async ({ afterConflict = false } = {}) => {
  if (!props.tripId) return;
  user.value = Utils.getStore("user");
  loading.value = true;
  onLoadStart({ afterConflict });

  try {
    if (isSystemAdmin.value) {
      const orgRes = await OrganizationServices.getAll();
      organizations.value = orgRes.data || [];
    }
    const res = await TripServices.get(props.tripId);
    applyTripData(res.data || {});
    setLeadersFromTrip(res.data?.leaderPeopleIds || []);
    await loadLeaderOptions(form.value.orgId);
    onLoadSuccess({ afterConflict });
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load trip.";
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.modelValue, props.tripId],
  ([open, id]) => {
    if (open && id) loadTrip();
    if (!open) {
      resetLeaders();
      clearImageSelection();
    }
  }
);

watch(
  () => form.value.orgId,
  (orgId, prevOrgId) => {
    if (!props.modelValue || loading.value || prevOrgId == null) return;
    loadLeaderOptions(orgId);
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
  prepareSave();

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
    version: form.value.version,
    leaderPeopleIds: leaderPeopleIds.value,
  };

  try {
    await TripServices.update(form.value.id, payload);
    if (imageFile.value) {
      await TripServices.uploadImage(form.value.id, imageFile.value);
    }
    emit("saved");
    close();
  } catch (e) {
    await handleSaveError(e, loadTrip, "Error saving trip.");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="560" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Edit trip</v-card-title>

      <v-card-text style="max-height: 70vh">
        <v-progress-linear v-if="loading" indeterminate class="mb-4" />

        <template v-if="!loading">
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
              :model-value="orgDisplayName"
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
                v-if="imagePreview || currentImageUrl"
                :src="imagePreview || currentImageUrl"
                alt="Trip image"
                max-width="160"
                max-height="100"
                cover
              />
              <span v-else class="text-caption text-medium-emphasis">No image uploaded</span>
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
        </template>

        <v-alert v-if="formNotice" type="warning" density="compact" class="mt-2">{{ formNotice }}</v-alert>
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" :disabled="loading" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
