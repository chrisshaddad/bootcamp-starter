import type { Dictionary } from '@/i18n/get-dictionary';
import { PORTAL_FALLBACK } from '@/components/portal/portal-dict.fallback';

/**
 * Shape of the `portal` i18n namespace (TP2).
 *
 * The keys are authored in the TP2 scratchpad and merged into
 * `en.json` / `ar.json` by the orchestrator (this slice must not touch the
 * catalogs). Until they land, `Dictionary` — inferred from `ar.json` — does
 * not know about `portal`, so we describe the shape here and read it through
 * `getPortalDict`. This keeps `check-types` green now and resolves at runtime
 * once the keys are merged, without every component re-casting `dict`.
 */
export type PortalDict = {
  brandSubtitle: string;
  nav: {
    home: string;
    availableUnits: string;
    support: string;
    profile: string;
  };
  userMenu: {
    signedInAs: string;
    profile: string;
    signOut: string;
    openMenu: string;
  };
  home: {
    welcome: string;
    subtitle: string;
    leaseTitle: string;
    unit: string;
    building: string;
    status: string;
    term: string;
    rent: string;
    to: string;
    noLease: string;
    notLinkedTitle: string;
    notLinkedDesc: string;
    loadError: string;
    viewSupport: string;
    // TP3 — lease history
    historyTitle: string;
    current: string;
    deposit: string;
    emptyHistory: string;
  };
  leaseStatus: {
    draft: string;
    active: string;
    expired: string;
    terminated: string;
  };
  // TP3 — available-units (display-only)
  availableUnits: {
    title: string;
    subtitle: string;
    empty: string;
    loadError: string;
    floor: string;
    bedrooms: string;
    bathrooms: string;
    area: string;
    sqftUnit: string;
  };
  // TP3 — support / requests (apartment-scoped maintenance)
  support: {
    title: string;
    subtitle: string;
    new: string;
    noLease: string;
    empty: string;
    emptyActive: string;
    created: string;
    createError: string;
    unit: string;
    status: {
      open: string;
      in_progress: string;
      resolved: string;
      closed: string;
    };
    priority: {
      low: string;
      medium: string;
      high: string;
      urgent: string;
    };
    form: {
      title: string;
      titleLabel: string;
      titlePlaceholder: string;
      titleRequired: string;
      priorityLabel: string;
      descriptionLabel: string;
      descriptionPlaceholder: string;
      cancel: string;
      submit: string;
      submitting: string;
    };
  };
  // TP3 — profile (shared labels come from `dict.profile`; only the extra
  // change-password link lives here).
  profile: {
    changePassword: string;
    changePasswordHint: string;
  };
  comingSoon: {
    badge: string;
    availableUnitsTitle: string;
    availableUnitsDesc: string;
    supportTitle: string;
    supportDesc: string;
    profileTitle: string;
    profileDesc: string;
  };
};

/**
 * Read the `portal` namespace off the shared dictionary. Falls back to the
 * local mirror (per `locale`) while the orchestrator's catalog merge is still
 * pending, so the portal never white-screens on a missing namespace.
 */
export function getPortalDict(dict: Dictionary, locale: string): PortalDict {
  const merged = (dict as unknown as { portal?: PortalDict }).portal;
  if (merged) return merged;
  return PORTAL_FALLBACK[locale === 'ar' ? 'ar' : 'en'];
}
