<script setup>
import { ref } from "vue";
import AuthServices from "../services/authServices.js";
import Utils from "../config/utils.js";
import { useRouter } from "vue-router";

const router = useRouter();
const mode = ref("login");

const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const firstName = ref("");
const lastName = ref("");
const selectedOrgIds = ref([]);
const organizations = ref([]);
const orgsLoading = ref(false);
const formError = ref("");
const loading = ref(false);

const storeUserAndGoHome = (data, { fromRegistration = false } = {}) => {
  const roleOrgs = Utils.getRoleOrgs(data);
  const activeOrg = (data.orgRoles || []).find((r) => r.roleName === "Org Admin");
  const user = {
    ...data,
    currentOrgId: activeOrg?.orgId ?? roleOrgs[0]?.orgId ?? null,
    currentOrgName: activeOrg?.orgName ?? roleOrgs[0]?.orgName ?? null,
    currentTripId: data.tripRoles?.[0]?.tripId ?? null,
    fromRegistration,
  };
  Utils.setStore("user", user);
  window.dispatchEvent(new CustomEvent("user-logged-in"));
  router.push({ name: "home" });
};

const login = () => {
  formError.value = "";
  loading.value = true;
  AuthServices.loginUser({ email: email.value, password: password.value })
    .then((res) => storeUserAndGoHome(res.data))
    .catch((e) => {
      formError.value = e.response?.data?.message || "Login failed.";
    })
    .finally(() => {
      loading.value = false;
    });
};

const register = () => {
  formError.value = "";
  if (password.value !== confirmPassword.value) {
    formError.value = "Passwords do not match.";
    return;
  }
  loading.value = true;
  AuthServices.registerUser({
    firstName: firstName.value,
    lastName: lastName.value,
    email: email.value,
    password: password.value,
    orgIds: selectedOrgIds.value,
  })
    .then((res) => storeUserAndGoHome(res.data, { fromRegistration: true }))
    .catch((e) => {
      formError.value = e.response?.data?.message || "Registration failed.";
    })
    .finally(() => {
      loading.value = false;
    });
};

const loadOrganizations = () => {
  orgsLoading.value = true;
  AuthServices.getRegisterOrganizations()
    .then((res) => {
      organizations.value = res.data || [];
    })
    .catch(() => {
      organizations.value = [];
    })
    .finally(() => {
      orgsLoading.value = false;
    });
};

const showRegister = () => {
  mode.value = "register";
  formError.value = "";
  loadOrganizations();
};

const showLogin = () => {
  mode.value = "login";
  formError.value = "";
  confirmPassword.value = "";
  firstName.value = "";
  lastName.value = "";
  selectedOrgIds.value = [];
};
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="5">
        <v-card class="pa-4">
          <v-card-title class="text-h5">
            {{ mode === "login" ? "Mission Trips" : "Create account" }}
          </v-card-title>
          <v-card-subtitle v-if="mode === 'register'" class="mb-2">
            Create your account and optionally request access to organizations as a pending user. If you were
            already added as a person, your existing record will be updated.
          </v-card-subtitle>
          <v-card-text>
            <template v-if="mode === 'login'">
              <v-text-field v-model="email" label="Email" type="email" autocomplete="username" />
              <v-text-field v-model="password" label="Password" type="password" autocomplete="current-password" />
              <v-alert v-if="formError" type="error" density="compact" class="mb-2">{{ formError }}</v-alert>
              <v-btn color="primary" block :loading="loading" @click="login">Sign in</v-btn>
              <div class="text-center mt-4">
                <v-btn variant="text" size="small" @click="showRegister">Add person / create account</v-btn>
              </div>
            </template>

            <template v-else>
              <v-text-field v-model="firstName" label="First name" autocomplete="given-name" />
              <v-text-field v-model="lastName" label="Last name" autocomplete="family-name" />
              <v-text-field v-model="email" label="Email" type="email" autocomplete="email" />
              <v-text-field v-model="password" label="Password" type="password" autocomplete="new-password" />
              <v-text-field
                v-model="confirmPassword"
                label="Confirm password"
                type="password"
                autocomplete="new-password"
              />
              <v-select
                v-model="selectedOrgIds"
                :items="organizations"
                item-title="name"
                item-value="id"
                label="Organizations (optional)"
                hint="Request access as a Pending User for selected organizations"
                persistent-hint
                multiple
                chips
                closable-chips
                :loading="orgsLoading"
                density="compact"
                class="mt-2"
              />
              <v-alert v-if="formError" type="error" density="compact" class="mb-2 mt-2">{{ formError }}</v-alert>
              <v-btn color="primary" block :loading="loading" class="mt-2" @click="register">Create account</v-btn>
              <div class="text-center mt-4">
                <v-btn variant="text" size="small" @click="showLogin">Back to sign in</v-btn>
              </div>
            </template>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
