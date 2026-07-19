export const TRIP_PARTICIPANT_STATUS_OPTIONS = [
  { title: "Incomplete", value: "incomplete" },
  { title: "Ready", value: "ready" },
  { title: "Approved", value: "approved" },
  { title: "Denied", value: "denied" },
  { title: "Canceled", value: "canceled" },
];

/** Map legacy status values from earlier status schemes. */
const LEGACY_STATUS_LABELS = {
  active: "Approved",
  inactive: "Incomplete",
  applied: "Incomplete",
};

export const tripParticipantStatusLabel = (value) => {
  if (value == null || value === "") return "—";
  const key = String(value).toLowerCase();
  return (
    TRIP_PARTICIPANT_STATUS_OPTIONS.find((o) => o.value === key)?.title ||
    LEGACY_STATUS_LABELS[key] ||
    value
  );
};

export const tripParticipantStatusColor = (value) => {
  const key = String(value || "").toLowerCase();
  if (key === "approved" || key === "ready") return "success";
  if (key === "denied" || key === "canceled") return "error";
  if (key === "incomplete" || key === "applied" || key === "inactive") return "warning";
  return "primary";
};
