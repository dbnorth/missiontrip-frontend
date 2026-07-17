const isBlank = (value) => value == null || String(value).trim() === "";

export const PROFILE_FIELD_CHECKS = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "email", label: "Email" },
  { key: "addLine1", label: "Address line 1" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "state_prov", label: "State/province" },
  { key: "postalCode", label: "Postal code" },
  { key: "phoneContryCode", label: "Phone country code" },
  { key: "phoneNumber", label: "Phone number" },
  { key: "birthDate", label: "Birthdate" },
  { key: "gender", label: "Gender" },
  { key: "emergencyContactName", label: "Emergency contact name" },
  { key: "emergencyContactPhoneCountryCode", label: "Emergency contact country code" },
  { key: "emergencyContactPhoneNumber", label: "Emergency contact phone number" },
  {
    key: "allergiesDescription",
    label: "Allergies description",
    required: (person) => !!person?.hasAllergies,
  },
  { key: "currentChurchHome", label: "Current church home" },
  { key: "currentChurchHomeCity", label: "Current church home city" },
  { key: "currentChurchHomeStateProv", label: "Current church home state/province" },
];

export const getMissingProfileFields = (person) => {
  if (!person) return PROFILE_FIELD_CHECKS.map((field) => field.label);

  return PROFILE_FIELD_CHECKS.filter((field) => {
    const isRequired = field.required ? field.required(person) : true;
    if (!isRequired) return false;
    return isBlank(person[field.key]);
  }).map((field) => field.label);
};

export const isProfileComplete = (person) => getMissingProfileFields(person).length === 0;

export const personDisplayName = (person, fallback = "Your profile") => {
  const name = `${person?.firstName || ""} ${person?.lastName || ""}`.trim();
  return name || fallback;
};
