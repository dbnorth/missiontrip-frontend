<script setup>
import { ref, watch } from "vue";
import PersonServices from "../services/personServices.js";
import RoleServices from "../services/roleServices.js";
import TripPeopleRoleServices from "../services/tripPeopleRoleServices.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tripId: { type: [Number, String], required: true },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const people = ref([]);
const roles = ref([]);
const saving = ref(false);
const formError = ref("");
const form = ref({ peopleId: null, roleId: null, status: "active", whygoText: "" });

const personLabel = (p) => `${p.firstName || ""} ${p.lastName || ""}`.trim();

const loadOptions = async () => {
  const [peopleRes, rolesRes] = await Promise.all([PersonServices.getAll(), RoleServices.getAll()]);
  people.value = peopleRes.data || [];
  roles.value = (rolesRes.data || []).filter((r) => r.roleName !== "Org Admin");
  const participantRole = roles.value.find((r) => r.roleName === "Trip Participant");
  form.value = {
    peopleId: null,
    roleId: participantRole?.id ?? roles.value[0]?.id ?? null,
    status: "active",
    whygoText: "",
  };
  formError.value = "";
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) loadOptions();
  }
);

const close = () => emit("update:modelValue", false);

const save = () => {
  if (!form.value.peopleId) {
    formError.value = "Person is required.";
    return;
  }
  if (!form.value.roleId) {
    formError.value = "Role is required.";
    return;
  }

  saving.value = true;
  formError.value = "";
  TripPeopleRoleServices.create({
    tripId: Number(props.tripId),
    peopleId: Number(form.value.peopleId),
    roleId: Number(form.value.roleId),
    status: form.value.status,
    whygoText: form.value.whygoText?.trim() || null,
  })
    .then(() => {
      emit("saved");
      close();
    })
    .catch((e) => {
      formError.value = e.response?.data?.message || "Error adding participant.";
    })
    .finally(() => {
      saving.value = false;
    });
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="480" @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Add participant</v-card-title>
      <v-card-text>
        <v-select
          v-model="form.peopleId"
          :items="people"
          :item-title="personLabel"
          item-value="id"
          label="Person"
          density="compact"
        />
        <v-select
          v-model="form.roleId"
          :items="roles"
          item-title="roleName"
          item-value="id"
          label="Role"
          density="compact"
        />
        <v-select
          v-model="form.status"
          :items="['active', 'inactive']"
          label="Status"
          density="compact"
        />
        <v-textarea v-model="form.whygoText" label="Why go" density="compact" rows="2" />
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
