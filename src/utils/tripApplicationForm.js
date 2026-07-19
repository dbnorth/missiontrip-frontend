const isBlank = (value) => value == null || String(value).trim() === "";

const LICENSE_STATUSES = ["yes", "yes_retired", "no"];

/**
 * Application fields excluding the participant agreement.
 * Used to gate agreeing until the rest of the form is filled in.
 */
export const isApplicationFormComplete = ({
  tripWorkerRoleId,
  willSelfFund,
  willRaiseFunds,
  licenseRequired = false,
  licenseStatus = null,
  hasPreferredRoommate = false,
  preferredRoommateNames = null,
}) => {
  if (tripWorkerRoleId == null || tripWorkerRoleId === "") return false;
  if (!willSelfFund && !willRaiseFunds) return false;
  if (licenseRequired && !LICENSE_STATUSES.includes(licenseStatus)) return false;
  if (hasPreferredRoommate && isBlank(preferredRoommateNames)) return false;
  return true;
};
