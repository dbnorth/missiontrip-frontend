export default class Utils {
  static formatDate = (dateStr) => {
    if (!dateStr) return "–";
    try {
      const d = new Date(dateStr + "T12:00:00");
      return d.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  static setStore = (name, content) => {
    if (!name) return;
    if (typeof content !== "string") content = JSON.stringify(content);
    return window.localStorage.setItem(name, content);
  };

  static getStore = (name) => {
    if (!name) return;
    const raw = window.localStorage.getItem(name);
    return raw ? JSON.parse(raw) : null;
  };

  static removeItem = (name) => {
    if (!name) return;
    return window.localStorage.removeItem(name);
  };

  static effectiveOrgId = (user) => {
    if (!user) return null;
    if (Utils.isSystemAdmin(user)) {
      if (user.actingOrganizationId === null || user.actingOrganizationId === "") return null;
      return user.actingOrganizationId ?? user.currentOrgId ?? null;
    }
    const selectable = Utils.getSelectableOrgs(user);
    if (selectable.length) {
      const current = user.currentOrgId;
      if (current != null && selectable.some((org) => Number(org.orgId) === Number(current))) {
        return Number(current);
      }
      return selectable[0].orgId;
    }
    return user.currentOrgId ?? user.orgRoles?.[0]?.orgId ?? user.tripRoles?.[0]?.orgId ?? null;
  };

  static getSelectableOrgs = (user) => {
    if (!user || Utils.isSystemAdmin(user)) return [];
    const byId = new Map();
    for (const role of user.orgRoles || []) {
      if (role.roleName !== "Org Admin" || role.orgId == null) continue;
      const orgId = Number(role.orgId);
      byId.set(orgId, {
        orgId,
        orgName: role.orgName,
        logo: role.logo,
        colorFamily: role.colorFamily,
      });
    }
    for (const role of user.tripRoles || []) {
      if (role.roleName !== "Trip Leader" || role.orgId == null) continue;
      const orgId = Number(role.orgId);
      if (byId.has(orgId)) continue;
      byId.set(orgId, {
        orgId,
        orgName: role.orgName,
        logo: role.orgLogo,
        colorFamily: role.orgColorFamily,
      });
    }
    return [...byId.values()].sort((a, b) => (a.orgName || "").localeCompare(b.orgName || ""));
  };

  static isOrgAdmin = (user, orgId) => {
    if (Utils.isSystemAdmin(user)) return true;
    return (user?.orgRoles || []).some(
      (r) => Number(r.orgId) === Number(orgId) && r.roleName === "Org Admin"
    );
  };

  static isTripLeader = (user, tripId) =>
    (user?.tripRoles || []).some(
      (r) => Number(r.tripId) === Number(tripId) && r.roleName === "Trip Leader"
    );

  static isTripParticipant = (user, tripId) =>
    (user?.tripRoles || []).some(
      (r) => Number(r.tripId) === Number(tripId) && r.roleName === "Trip Participant"
    );

  static isSystemAdmin = (user) => !!user && (user.isAdmin === true || user.isAdmin === 1);

  static hasActiveAccess = (user) => {
    if (Utils.isSystemAdmin(user)) return true;
    const hasActiveOrg = (user?.orgRoles || []).some((r) => r.roleName === "Org Admin");
    const hasTrip = (user?.tripRoles || []).length > 0;
    return hasActiveOrg || hasTrip;
  };

  static pendingOrgNames = (user) =>
    (user?.orgRoles || [])
      .filter((r) => r.roleName === "Pending User")
      .map((r) => r.orgName)
      .filter(Boolean);

  static showOrgScopeNotice = (user) => {
    if (!user) return false;
    if (Utils.isSystemAdmin(user)) return true;
    return Utils.getSelectableOrgs(user).length > 1;
  };

  static orgDisplayName = (user, orgId) => {
    if (!user || orgId == null) return null;
    const id = Number(orgId);
    if (
      user.currentOrgName &&
      user.currentOrgId != null &&
      Number(user.currentOrgId) === id
    ) {
      return user.currentOrgName;
    }
    const fromOrgRole = (user.orgRoles || []).find((r) => Number(r.orgId) === id)?.orgName;
    if (fromOrgRole) return fromOrgRole;
    const fromTripRole = (user.tripRoles || []).find((r) => Number(r.orgId) === id)?.orgName;
    if (fromTripRole) return fromTripRole;
    const selectable = Utils.getSelectableOrgs(user);
    const match = selectable.find((org) => Number(org.orgId) === id);
    return match?.orgName || null;
  };

  static currentOrg = (user) => {
    const orgId = Utils.effectiveOrgId(user);
    if (!orgId) return null;
    const selectable = Utils.getSelectableOrgs(user);
    const match = selectable.find((org) => Number(org.orgId) === Number(orgId));
    if (match) return match;
    const fromRole = (user?.orgRoles || []).find((r) => Number(r.orgId) === Number(orgId));
    if (fromRole) return fromRole;
    const name = Utils.orgDisplayName(user, orgId);
    if (name) return { orgId: Number(orgId), orgName: name };
    return null;
  };
}
