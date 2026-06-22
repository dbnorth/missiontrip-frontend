<script setup>
import { ref, watch } from "vue";
import OrganizationServices from "../services/organizationServices.js";
import OrganizationFormFields from "./OrganizationFormFields.vue";
import { emptyOrganizationForm, buildOrganizationPayload } from "../utils/organizationForm.js";
import { formatCountryCode, validatePhoneFields } from "../utils/phoneUtils.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const formError = ref("");
const saving = ref(false);
const form = ref(emptyOrganizationForm());

const resetForm = () => {
  form.value = emptyOrganizationForm();
  formError.value = "";
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) resetForm();
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
  formError.value = "";

  const payload = buildOrganizationPayload({
    ...form.value,
    phoneContryCode: form.value.phoneContryCode ? formatCountryCode(form.value.phoneContryCode) : "",
  });

  OrganizationServices.create(payload)
    .then((res) => {
      emit("saved", res.data);
      close();
    })
    .catch((e) => {
      formError.value = e.response?.data?.message || "Error saving organization.";
    })
    .finally(() => {
      saving.value = false;
    });
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="560" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Add organization</v-card-title>

      <v-card-text style="max-height: 70vh">
        <OrganizationFormFields v-model="form" />
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
