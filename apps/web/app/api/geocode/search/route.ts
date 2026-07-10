import { NextResponse, type NextRequest } from 'next/server';
import { GEOCODE_TTL_SECONDS, nominatim } from '../nominatim';

// Forward geocoding: place text → coordinates. Lebanon-biased, English names,
// matching the picker's previous behaviour but proxied server-side.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  // Mirror the client's minimum length so a stray short query can't spam the
  // upstream service.
  if (q.length < 3) return NextResponse.json([]);

  const res = await nominatim(
    '/search',
    {
      format: 'jsonv2',
      countrycodes: 'lb',
      'accept-language': 'en',
      addressdetails: '0',
      limit: '6',
      q,
    },
    GEOCODE_TTL_SECONDS,
  );
  if (!res.ok) return NextResponse.json([], { status: 502 });

  const data: Array<{ lat: string; lon: string; display_name: string }> =
    await res.json();
  return NextResponse.json(
    data.map((item) => ({
      label: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon),
    })),
  );
}
