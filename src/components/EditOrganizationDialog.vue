<script setup>
import { ref, watch } from "vue";
import OrganizationServices from "../services/organizationServices.js";
import OrganizationFormFields from "./OrganizationFormFields.vue";
import { emptyOrganizationForm, buildOrganizationPayload } from "../utils/organizationForm.js";
import { normalizeAddressFields } from "../utils/locationData.js";
import { formatPhoneForDisplay, formatCountryCode, validatePhoneFields } from "../utils/phoneUtils.js";
import { useVersionConflictForm } from "../utils/useVersionConflictForm.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  organizationId: { type: [Number, String], default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const loading = ref(false);
const saving = ref(false);
const { formError, formNotice, prepareSave, onLoadStart, onLoadSuccess, handleSaveError } =
  useVersionConflictForm();

const form = ref(emptyOrganizationForm());

const applyOrgData = (data) => {
  const normalized = normalizeAddressFields(data || {});
  form.value = {
    ...emptyOrganizationForm(),
    ...data,
    ...normalized,
    phoneNumber: formatPhoneForDisplay(data.phoneNumber),
    phoneContryCode: data.phoneContryCode ? formatCountryCode(data.phoneContryCode) : "",
  };
};

const loadOrganization = async ({ afterConflict = false } = {}) => {
  if (!props.organizationId) return;
  loading.value = true;
  onLoadStart({ afterConflict });
  try {
    const res = await OrganizationServices.get(props.organizationId);
    applyOrgData(res.data || {});
    onLoadSuccess({ afterConflict });
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load organization.";
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.modelValue, props.organizationId],
  ([open, id]) => {
    if (open && id) loadOrganization();
  }
);

const close = () => emit("update:modelValue", false);

const save = () => {
  if (!form.value.name?.trim()) {
    formError.value = "Organization name is required.";
    return;
  }

  const phoneValidation = validatePhoneFields(form.value.phoneContryCode, form.value.phoneNumber);
  if (phoneValidation !== true) {
    formError.value = phoneValidation;
    return;
  }

  saving.value = true;
  prepareSave();

  const payload = buildOrganizationPayload(
    {
      ...form.value,
      phoneContryCode: form.value.phoneContryCode ? formatCountryCode(form.value.phoneContryCode) : "",
    },
    { includeVersion: true }
  );

  OrganizationServices.update(form.value.id, payload)
    .then(() => {
      emit("saved");
      close();
    })
    .catch(async (e) => {
      await handleSaveError(e, loadOrganization, "Error saving organization.");
    })
    .finally(() => {
      saving.value = false;
    });
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="560" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Edit organization</v-card-title>

      <v-card-text style="max-height: 70vh">
        <v-progress-linear v-if="loading" indeterminate class="mb-4" />

        <template v-if="!loading">
          <OrganizationFormFields v-model="form" />
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
