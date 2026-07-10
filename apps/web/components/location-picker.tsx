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
  // Set when a forward/reverse geocode genuinely fails (network down or the
  // proxy/Nominatim erroring) so we can tell the admin the lookup is unavailable
  // instead of silently doing nothing. Aborted requests don't count.
  const [geocodeError, setGeocodeError] = useState(false);
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
      // Server-side proxy (see app/api/geocode) — the browser must never hit
      // Nominatim directly. Debouncing here still limits upstream load.
      fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
        .then((res) => {
          // A non-ok response is a real service failure (proxy/Nominatim down),
          // not an empty result set — surface it rather than showing "no matches".
          if (!res.ok) throw new Error('Geocode search failed');
          return res.json();
        })
        .then((data: GeocodeResult[]) => {
          setResults(data);
          setOpen(true);
          setGeocodeError(false);
        })
        .catch((err: unknown) => {
          // A newer keystroke / unmount aborted this request — expected, ignore.
          if ((err as { name?: string })?.name === 'AbortError') return;
          setResults([]);
          setGeocodeError(true);
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
      // Server-side proxy (see app/api/geocode) — no direct browser → Nominatim.
      fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error('Reverse geocode failed');
          return res.json();
        })
        .then((data: { label?: string } | null) => {
          if (data?.label) {
            typingRef.current = false;
            lastReverseKeyRef.current = key;
            setQuery(data.label);
            setResults([]);
            setOpen(false);
          }
          setGeocodeError(false);
        })
        .catch((err: unknown) => {
          // Aborted by a newer coordinate change / unmount — expected, ignore.
          if ((err as { name?: string })?.name === 'AbortError') return;
          setGeocodeError(true);
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

      {geocodeError ? (
        <p className="text-xs text-error">
          Location lookup is unavailable right now. You can still set the
          location by clicking the map or entering coordinates manually below.
        </p>
      ) : null}

      <LocationMap lat={lat} lng={lng} onPick={pickFromMap} />

      <p className="text-xs text-gray-500">
        Search a place, or click / drag the pin to set the location. The search
        box and the latitude / longitude below stay in sync automatically.
      </p>
    </div>
  );
}
