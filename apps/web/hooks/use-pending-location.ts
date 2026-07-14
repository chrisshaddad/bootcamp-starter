'use client';

import { useEffect, useRef } from 'react';
import { useProfile, useProfileActions } from '@/hooks/use-profile';

// Where the signup form stashes an optional location. It can't be saved at
// signup (that flow is pre-auth and PATCH /profile needs a session), so it's
// held here and applied on the client's first authenticated load.
export const PENDING_LOCATION_KEY = 'medfind:pending-location';

/**
 * Applies a location captured during signup once the client is signed in.
 * Reads the stashed coords, saves them via PATCH /profile if the profile has no
 * location yet, then clears the stash. A no-op when there's nothing pending.
 */
export function useApplyPendingLocation(): void {
  const { profile } = useProfile();
  const { updateProfile } = useProfileActions();
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    if (typeof window === 'undefined' || !profile) return;

    const raw = window.localStorage.getItem(PENDING_LOCATION_KEY);
    if (!raw) return;

    // Already has a location (set elsewhere) — the stash is stale, drop it.
    if (profile.latitude !== null || profile.longitude !== null) {
      window.localStorage.removeItem(PENDING_LOCATION_KEY);
      doneRef.current = true;
      return;
    }

    let coords: { lat: number; lng: number } | null = null;
    try {
      const parsed = JSON.parse(raw) as { lat?: unknown; lng?: unknown };
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        coords = { lat: parsed.lat, lng: parsed.lng };
      }
    } catch {
      // corrupt payload — fall through and clear it
    }
    if (!coords) {
      window.localStorage.removeItem(PENDING_LOCATION_KEY);
      doneRef.current = true;
      return;
    }

    doneRef.current = true;
    void updateProfile({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phoneNumber: profile.phoneNumber,
      dateOfBirth: profile.dateOfBirth
        ? String(profile.dateOfBirth).slice(0, 10)
        : null,
      address: profile.address,
      latitude: coords.lat,
      longitude: coords.lng,
    })
      .then(() => window.localStorage.removeItem(PENDING_LOCATION_KEY))
      .catch(() => {
        // Let a later mount retry (e.g. transient network error).
        doneRef.current = false;
      });
  }, [profile, updateProfile]);
}
