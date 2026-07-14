/** Convert a display name to a URL path segment (spaces become underscores). */
export function toUrlSlug(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[/?#]+/g, "");
}

export function personUrlSlug(person) {
  if (!person) return "";
  if (person.firstName || person.lastName) {
    return toUrlSlug(`${person.firstName || ""} ${person.lastName || ""}`.trim());
  }
  return toUrlSlug(person.name || "");
}

/** Public trip donate URL — trip name only (no ids). */
export function donorTripPath(trip) {
  const slug = toUrlSlug(trip?.name);
  return slug ? `/donate/trip/${slug}` : "/donate/trip";
}

/** Public participant donate URL — trip name + person name (no ids). */
export function donorParticipantPath(trip, person) {
  const tripSlug = toUrlSlug(trip?.name);
  const personSlug = personUrlSlug(person);
  if (tripSlug && personSlug) {
    return `/donate/trip/${tripSlug}/participant/${personSlug}`;
  }
  if (tripSlug) return `/donate/trip/${tripSlug}`;
  return "/donate/trip";
}
