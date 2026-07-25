<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import AuthServices from "../services/authServices.js";
import Utils from "../config/utils.js";

const props = defineProps({
  organizationId: { type: [Number, String], default: null },
  organizationName: { type: String, default: "" },
});

const router = useRouter();
const showRegisterDialog = ref(false);
const showAccountExistsDialog = ref(false);
const existingAccountEmail = ref("");
const registerForm = ref({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
});
const registerError = ref("");
const registering = ref(false);

const resetRegisterForm = () => {
  registerForm.value = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  };
  registerError.value = "";
};

/** Public Apply always starts with create-account (not the trip application form). */
const openForTrip = (trip) => {
  if (!trip?.id) return;
  resetRegisterForm();
  showAccountExistsDialog.value = false;
  showRegisterDialog.value = true;
};

const closeRegisterDialog = () => {
  showRegisterDialog.value = false;
  registerError.value = "";
};

const submitRegistration = () => {
  registerError.value = "";
  const f = registerForm.value;
  if (!f.firstName || !f.lastName || !f.email || !f.password) {
    registerError.value = "Please fill in all fields.";
    return;
  }
  if (f.password !== f.confirmPassword) {
    registerError.value = "Passwords do not match.";
    return;
  }

  const orgId = props.organizationId != null ? Number(props.organizationId) : null;
  registering.value = true;
  AuthServices.registerUser({
    firstName: f.firstName,
    lastName: f.lastName,
    email: f.email,
    password: f.password,
    orgIds: orgId ? [orgId] : [],
  })
    .then((res) => {
      const data = res.data;
      const scopeOrgs = Utils.getScopeOrgs(data);
      const activeOrg =
        scopeOrgs.find((o) => Number(o.orgId) === Number(orgId)) || scopeOrgs[0] || null;
      const newUser = {
        ...data,
        currentOrgId: activeOrg?.orgId ?? orgId ?? null,
        currentOrgName: activeOrg?.orgName ?? props.organizationName ?? null,
        currentTripId: data.tripRoles?.[0]?.tripId ?? null,
        fromRegistration: true,
      };
      Utils.setStore("user", newUser);
      window.dispatchEvent(new CustomEvent("user-logged-in"));
      router.push({ name: "home" });
    })
    .catch((e) => {
      if (e.response?.status === 409) {
        existingAccountEmail.value = f.email;
        showRegisterDialog.value = false;
        showAccountExistsDialog.value = true;
        return;
      }
      registerError.value = e.response?.data?.message || "Registration failed.";
    })
    .finally(() => {
      registering.value = false;
    });
};

const goToLogin = () => {
  showAccountExistsDialog.value = false;
  router.push({ name: "login" });
};

defineExpose({ openForTrip });
</script>

<template>
  <v-dialog v-model="showRegisterDialog" max-width="520" persistent>
    <v-card class="pa-2">
      <v-card-title class="text-h6">Create account</v-card-title>
      <v-card-subtitle class="text-wrap">
        To apply first create an account in our system.
        If you already have an account,
        <router-link :to="{ name: 'login' }" @click="closeRegisterDialog">Log in</router-link>.
      </v-card-subtitle>
      <v-card-text>
        <v-text-field
          v-model="registerForm.firstName"
          label="First name"
          autocomplete="given-name"
        />
        <v-text-field
          v-model="registerForm.lastName"
          label="Last name"
          autocomplete="family-name"
        />
        <v-text-field
          v-model="registerForm.email"
          label="Email"
          type="email"
          autocomplete="email"
        />
        <v-text-field
          v-model="registerForm.password"
          label="Password"
          type="password"
          autocomplete="new-password"
        />
        <v-text-field
          v-model="registerForm.confirmPassword"
          label="Confirm password"
          type="password"
          autocomplete="new-password"
        />
        <v-alert v-if="registerError" type="error" density="compact" class="mt-2">
          {{ registerError }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="registering" @click="closeRegisterDialog">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :loading="registering" @click="submitRegistration">
          Create account
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showAccountExistsDialog" max-width="460">
    <v-card class="pa-2">
      <v-card-title class="text-h6">Account already exists</v-card-title>
      <v-card-text>
        There is already an account for
        <strong>{{ existingAccountEmail }}</strong>. Please sign in to apply.
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showAccountExistsDialog = false">Cancel</v-btn>
        <v-btn color="primary" variant="flat" @click="goToLogin">Go to sign in</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
