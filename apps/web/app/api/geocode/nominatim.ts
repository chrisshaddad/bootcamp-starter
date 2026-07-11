// Server-side proxy to OpenStreetMap's Nominatim geocoder.
//
// Nominatim's usage policy forbids client-side autocomplete and requires every
// request to carry a User-Agent that identifies the application with a contact.
// Calling it from the browser (as this app used to) violates both and risks the
// whole app being blocked, so all geocoding now flows through here: the request
// runs on the Next server with a proper identifying header, and Next's data
// cache dedupes repeat lookups to keep us well under the rate limit.
const NOMINATIM = 'https://nominatim.openstreetmap.org';

const isProduction = process.env.NODE_ENV === 'production';

// Nominatim mandates an identifying User-Agent with a way to reach the operator
// (so they contact us before blocking, rather than just blocking). A link to the
// project counts as a valid contact, so the repo URL is a real, non-personal
// default — never a placeholder. Override GEOCODING_CONTACT with a monitored
// project address per environment.
const FALLBACK_CONTACT = 'https://github.com/chrisshaddad/bootcamp-starter';
const CONTACT = process.env.GEOCODING_CONTACT?.trim() || FALLBACK_CONTACT;
const USER_AGENT = `bootcamp-pharmacy-admin (${CONTACT})`;

// The default is policy-compliant, but nudge operators to set a real project
// contact in production so abuse reports reach a monitored inbox, not the repo.
if (!process.env.GEOCODING_CONTACT?.trim() && isProduction) {
  console.warn(
    '[geocode] GEOCODING_CONTACT is not set; falling back to the repository ' +
      'URL for the Nominatim User-Agent. Set it to a monitored contact address.',
  );
}

// Bound the upstream call so a slow/unresponsive Nominatim can't hang the Next
// server request indefinitely (the client debounces but imposes no timeout of
// its own). 5s is generous for a geocode lookup while capping worst-case hang.
const UPSTREAM_TIMEOUT_MS = 5000;

/**
 * Fetch a Nominatim endpoint server-side. `revalidate` (seconds) drives Next's
 * data cache so identical lookups don't re-hit the upstream service.
 */
export async function nominatim(
  path: string,
  params: Record<string, string>,
  revalidate: number,
): Promise<Response> {
  const url = `${NOMINATIM}${path}?${new URLSearchParams(params).toString()}`;
  try {
    return await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    // Timeout (or a network failure) — return a gateway-timeout Response so
    // callers take their existing `!res.ok` path instead of throwing a 500.
    // The synthetic Response isn't cached, so a transient hiccup can retry.
    return new Response(null, { status: 504 });
  }
}

// Place names and coordinates are effectively static, so cache a full day. This
// is what keeps proxied autocomplete within Nominatim's acceptable-use limits.
export const GEOCODE_TTL_SECONDS = 60 * 60 * 24;
