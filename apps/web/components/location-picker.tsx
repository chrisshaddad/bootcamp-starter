'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

// The Leaflet map touches `window`, so it can only run in the browser. Load it
// client-side only; show a matching placeholder while it hydrates.
const LocationMap = dynamic(() => import('./location-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-[10px] border border-gray-200 bg-gray-50">
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
    </div>
  ),
});

interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

// Parse a form string ("33.8938") into a finite number, or null when blank /
// mid-typing ("-", "33."), so the map only pins a real coordinate.
function toCoord(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

// 6 decimals ≈ 0.11 m — plenty precise, and keeps the stored value tidy.
function fmt(value: number): string {
  return value.toFixed(6);
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';

/**
 * Map-based location picker (Leaflet + OpenStreetMap, no API key). Everything
 * stays in sync in both directions:
 *   • search → pin: pick a Lebanese place and the pin + lat/long update.
 *   • pin → search: click/drag the pin (or type coordinates) and the search box
 *     fills with the English name of that place (reverse geocoding).
 * The numeric fields live alongside it (in the host form) as a precise fallback.
 */
export function LocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Only fetch predictions / open the dropdown while the user is actively
  // typing — not when we set the box programmatically (a selection or a reverse
  // geocode), which would otherwise re-trigger a search or reopen the list.
  const typingRef = useRef(false);
  // Set right before we change the coordinates from a chosen search result, so
  // the reverse-geocode effect skips that round and keeps the chosen label.
  const suppressReverseRef = useRef(false);
  // The last coordinate we reverse-geocoded, so we don't repeat the request.
  const lastReverseKeyRef = useRef<string | null>(null);

  const lat = toCoord(latitude);
  const lng = toCoord(longitude);

  // search → pin: debounced, Lebanon-biased, English forward geocoding.
  useEffect(() => {
    const q = query.trim();
    if (!typingRef.current || q.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      const url =
        `${NOMINATIM}/search?format=jsonv2` +
        // Lebanon only, English names.
        '&countrycodes=lb&accept-language=en&addressdetails=0&limit=6&q=' +
        encodeURIComponent(q);
      fetch(url, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : []))
        .then(
          (data: Array<{ lat: string; lon: string; display_name: string }>) => {
            setResults(
              data.map((item) => ({
                label: item.display_name,
                lat: Number(item.lat),
                lng: Number(item.lon),
              })),
            );
            setOpen(true);
          },
        )
        .catch(() => {
          /* aborted or network error — leave results as-is */
        })
        .finally(() => setSearching(false));
    }, 450);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  // pin → search: when the coordinate changes (map click/drag, typed fields, or
  // initial load), reverse-geocode it and show the English place name in the box.
  useEffect(() => {
    if (lat === null || lng === null) return;
    const key = `${lat}|${lng}`;
    if (key === lastReverseKeyRef.current) return;

    // A change we caused by selecting a search result — keep that label as-is.
    if (suppressReverseRef.current) {
      suppressReverseRef.current = false;
      lastReverseKeyRef.current = key;
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      const url =
        `${NOMINATIM}/reverse?format=jsonv2` +
        `&accept-language=en&zoom=16&lat=${lat}&lon=${lng}`;
      fetch(url, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { display_name?: string } | null) => {
          if (data?.display_name) {
            typingRef.current = false;
            lastReverseKeyRef.current = key;
            setQuery(data.display_name);
            setResults([]);
            setOpen(false);
          }
        })
        .catch(() => {
          /* aborted or network error — leave the box as-is */
        });
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [lat, lng]);

  // Close the results dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function handle(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Set the pin from a map click / drag. The reverse-geocode effect above then
  // fills the search box with the place name.
  const pickFromMap = (nextLat: number, nextLng: number) => {
    onChange(fmt(nextLat), fmt(nextLng));
  };

  const chooseResult = (result: GeocodeResult) => {
    // Keep the chosen label; don't let the coordinate change reverse-geocode
    // over it.
    suppressReverseRef.current = true;
    typingRef.current = false;
    onChange(fmt(result.lat), fmt(result.lng));
    setQuery(result.label);
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div ref={boxRef} className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(event) => {
            typingRef.current = true;
            setQuery(event.target.value);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search for a place in Lebanon…"
          className="pr-9 pl-9"
        />
        {searching ? (
          <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        ) : null}

        {open && results.length > 0 ? (
          <ul className="thin-scroll absolute z-1000 mt-1 max-h-56 w-full overflow-y-auto rounded-[10px] border border-gray-200 bg-white p-1 shadow-lg">
            {results.map((result, index) => (
              <li key={`${result.lat}-${result.lng}-${index}`}>
                <button
                  type="button"
                  onClick={() => chooseResult(result)}
                  className="flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-gray-100"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span className="min-w-0 flex-1 text-gray-700">
                    {result.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <LocationMap lat={lat} lng={lng} onPick={pickFromMap} />

      <p className="text-xs text-gray-500">
        Search a place, or click / drag the pin to set the location. The search
        box and the latitude / longitude below stay in sync automatically.
      </p>
    </div>
  );
}
