import { NextResponse, type NextRequest } from 'next/server';
import { GEOCODE_TTL_SECONDS, nominatim } from '../nominatim';

// Reverse geocoding: coordinates → English place name for the search box.
export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat');
  const lng = request.nextUrl.searchParams.get('lng');
  if (!lat || !lng) return NextResponse.json(null, { status: 400 });

  const res = await nominatim(
    '/reverse',
    {
      format: 'jsonv2',
      'accept-language': 'en',
      zoom: '16',
      lat,
      lon: lng,
    },
    GEOCODE_TTL_SECONDS,
  );
  if (!res.ok) return NextResponse.json(null, { status: 502 });

  const data: { display_name?: string } = await res.json();
  return NextResponse.json(
    data.display_name ? { label: data.display_name } : null,
  );
}
