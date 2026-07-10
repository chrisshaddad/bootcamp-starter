// Server-side proxy to OpenStreetMap's Nominatim geocoder.
//
// Nominatim's usage policy forbids client-side autocomplete and requires every
// request to carry a User-Agent that identifies the application with a contact.
// Calling it from the browser (as this app used to) violates both and risks the
// whole app being blocked, so all geocoding now flows through here: the request
// runs on the Next server with a proper identifying header, and Next's data
// cache dedupes repeat lookups to keep us well under the rate limit.
const NOMINATIM = 'https://nominatim.openstreetmap.org';

// Nominatim mandates an identifying User-Agent with a way to reach the operator.
// Point GEOCODING_CONTACT at a real address in each environment.
const CONTACT = process.env.GEOCODING_CONTACT ?? 'admin@localhost';
const USER_AGENT = `bootcamp-pharmacy-admin (${CONTACT})`;

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
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate },
  });
}

// Place names and coordinates are effectively static, so cache a full day. This
// is what keeps proxied autocomplete within Nominatim's acceptable-use limits.
export const GEOCODE_TTL_SECONDS = 60 * 60 * 24;
