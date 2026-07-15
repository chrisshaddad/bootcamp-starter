// External maps directions link built from a coordinate — no API key, and
// (unlike the in-app Lebanon-locked LocationMap) it works for any coordinate.
// Shared by the medicine-detail, directory list, and branch-detail pages.
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
