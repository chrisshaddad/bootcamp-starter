'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';

// A self-contained SVG pin (brand green) rendered as a divIcon. Using inline SVG
// instead of Leaflet's default PNG marker avoids the well-known bundler issue
// where the image URLs break and the pin fails to render — nothing to download.
const PIN_ICON = L.divIcon({
  className: 'location-pin',
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 24 34" style="filter: drop-shadow(0 2px 2px rgba(0,0,0,0.35));">
      <path d="M12 0C5.9 0 1 4.9 1 11c0 7.7 9.4 21.4 10.1 22.3.5.6 1.4.6 1.8 0C13.6 32.4 23 18.7 23 11 23 4.9 18.1 0 12 0z" fill="#27a376"/>
      <circle cx="12" cy="11" r="4" fill="#ffffff"/>
    </svg>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42], // tip of the pin sits on the coordinate
  popupAnchor: [0, -38],
});

// Lebanon only: centre, sensible zoom range, and a hard pan boundary (with a
// little padding) so the map can't drift off the country.
const LEBANON_CENTER: [number, number] = [33.8547, 35.8623];
const LEBANON_BOUNDS: [[number, number], [number, number]] = [
  [32.9, 34.9], // south-west
  [34.8, 36.8], // north-east
];
const COUNTRY_ZOOM = 8;
const POINT_ZOOM = 15;
const MIN_ZOOM = 8;
const MAX_ZOOM = 19;

// Is a coordinate actually inside Lebanon? Guards against stray data (e.g. a
// profile seeded with random world coordinates) that would otherwise make the
// Lebanon-locked map clamp to a corner out at sea.
function inLebanon(lat: number, lng: number): boolean {
  const [[south, west], [north, east]] = LEBANON_BOUNDS;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

// Keep the map in step with the lat/long coming from the form: pan to a new
// point when it lands outside the current view (a search hit or typed coords),
// but stay put for small in-view marker drags so the map doesn't jump.
function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat === null || lng === null || !inLebanon(lat, lng)) return;
    if (!map.getBounds().contains([lat, lng])) {
      map.setView([lat, lng], Math.max(map.getZoom(), POINT_ZOOM));
    }
  }, [map, lat, lng]);
  return null;
}

// Drop / move the pin by clicking anywhere on the map.
function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (event) => onPick(event.latlng.lat, event.latlng.lng),
  });
  return null;
}

export default function LocationMap({
  lat,
  lng,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  // Only treat the point as real if it's within Lebanon; otherwise open on the
  // country view instead of clamping to a sea corner.
  const hasPoint = lat !== null && lng !== null && inLebanon(lat, lng);

  return (
    <MapContainer
      center={hasPoint ? [lat, lng] : LEBANON_CENTER}
      zoom={hasPoint ? POINT_ZOOM : COUNTRY_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      maxBounds={LEBANON_BOUNDS}
      maxBoundsViscosity={1}
      scrollWheelZoom
      // `isolate` gives the map its own stacking context so Leaflet's internal
      // z-indexes (panes/controls, up to ~1000) can't paint over popups that
      // open above it — e.g. the phone country list and the date-of-birth
      // calendar in the profile form.
      className="isolate h-64 w-full rounded-[10px]"
    >
      {/* CARTO Voyager: OpenStreetMap data on a fast global CDN, with Latin
          (transliterated) labels — so Lebanese place names render in Latin
          script rather than Arabic. Clean, low-lag, no API key. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={MAX_ZOOM}
      />
      <ClickHandler onPick={onPick} />
      <Recenter lat={lat} lng={lng} />
      {hasPoint ? (
        <Marker
          position={[lat, lng]}
          icon={PIN_ICON}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const { lat: newLat, lng: newLng } = event.target.getLatLng();
              onPick(newLat, newLng);
            },
          }}
        />
      ) : null}
    </MapContainer>
  );
}
