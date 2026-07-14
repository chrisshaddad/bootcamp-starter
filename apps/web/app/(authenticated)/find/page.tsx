'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Navigation,
  Pill,
  Search,
} from 'lucide-react';
import type { MedicineResponse } from '@repo/contracts';
import { useProfile } from '@/hooks/use-profile';
import { useCatalog } from '@/hooks/use-catalog';
import { useApplyPendingLocation } from '@/hooks/use-pending-location';
import { formatPrice } from '@/lib/stock';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ENTER, enterStyle } from '@/lib/enter-animation';

const PAGE_SIZE = 6; // 2 per row × 3 rows

const EXAMPLES = [
  'Panadol Extra',
  'Augmentin',
  'Insulin',
  'Vitamin D3',
  'Ventolin',
];
const POPULAR = ['Panadol', 'Augmentin', 'Insulin', 'Ventolin', 'Vitamin D'];

// Example map pins on the hero visual, spread far apart so the active marker
// swipes across between distant areas, panning the map with it. Illustrative.
const PINS = [
  { x: 14, y: 30, area: 'Hamra, Beirut', dist: '400 m' },
  { x: 86, y: 26, area: 'El Mina, Tripoli', dist: '1.2 km' },
  { x: 82, y: 72, area: 'Riad El Solh, Saida', dist: '800 m' },
  { x: 18, y: 68, area: 'Manara, Zahle', dist: '2.4 km' },
];

// Cycles through `words`, typing each out, and reports the active index so the
// map's pin moves in step. Honors prefers-reduced-motion.
function useTypewriter(words: string[]): { typed: string; index: number } {
  const [typed, setTyped] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(words[0] ?? '');
      setIndex(0);
      return;
    }
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(setTimeout(resolve, ms));
      });
    const run = async () => {
      let i = 0;
      while (!cancelled) {
        const word = words[i] ?? '';
        setIndex(i);
        for (let c = 1; c <= word.length; c++) {
          if (cancelled) return;
          setTyped(word.slice(0, c));
          await wait(80);
        }
        await wait(1400);
        // Erase to the first letter (never blank) so names flow into each other.
        for (let c = word.length - 1; c >= 1; c--) {
          if (cancelled) return;
          setTyped(word.slice(0, c));
          await wait(35);
        }
        i = (i + 1) % words.length;
      }
    };
    void run();
    return () => {
      cancelled = true;
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [words]);

  return { typed, index };
}

// The map hero art: a stylised map that pans as the active location swipes
// between far-apart pins, with a floating search chip + nearest-pharmacy result.
function HeroVisual({ typed, index }: { typed: string; index: number }) {
  const active = index % PINS.length;
  const a = PINS[active] ?? PINS[0]!;
  const panX = (50 - a.x) * 0.6;
  const panY = (50 - a.y) * 0.6;
  const glide = 'cubic-bezier(.22,.7,.2,1)';

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] border border-[#e6f0ea] bg-white shadow-[0_45px_90px_-45px_rgba(20,83,60,0.45)]">
      {/* panning map: grid + streets sweep together */}
      <div
        className="absolute inset-[-40%]"
        style={{
          transform: `translate(${panX}%, ${panY}%)`,
          transition: `transform 0.9s ${glide}`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(39,163,118,0.14) 1.3px, transparent 1.3px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="absolute top-[36%] -left-[15%] h-3 w-[130%] rounded-full bg-[#eef4f1]"
          style={{
            transform: `rotate(${-22 + active * 16}deg)`,
            transition: `transform 0.9s ${glide}`,
          }}
        />
        <div
          className="absolute top-[70%] -left-[15%] h-3 w-[130%] rounded-full bg-[#eef4f1]"
          style={{
            transform: `rotate(${14 - active * 14}deg)`,
            transition: `transform 0.9s ${glide}`,
          }}
        />
        <div
          className="absolute -top-[15%] left-[44%] h-[130%] w-3 rounded-full bg-[#eef4f1]"
          style={{
            transform: `rotate(${18 + active * 11}deg)`,
            transition: `transform 0.9s ${glide}`,
          }}
        />
      </div>

      {/* the other areas as muted dots (container space) */}
      {PINS.map((pin, i) =>
        i === active ? null : (
          <span
            key={pin.area}
            className="absolute z-10 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-300 ring-4 ring-primary-100"
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          />
        ),
      )}

      {/* active marker — swipes across to the current area */}
      <span
        className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${a.x}%`,
          top: `${a.y}%`,
          transition: `left 0.9s ${glide}, top 0.9s ${glide}`,
        }}
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary-base text-white shadow-[0_10px_20px_-6px_rgba(39,163,118,0.9)]">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary-base/40" />
          <MapPin className="relative h-4.5 w-4.5" />
        </span>
      </span>

      {/* floating search chip */}
      <div className="absolute inset-x-4 top-4 flex items-center gap-2.5 rounded-2xl border border-[#e6f0ea] bg-white/95 px-3.5 py-3 shadow-[0_16px_35px_-18px_rgba(20,83,60,0.5)] backdrop-blur">
        <Search className="h-4 w-4 shrink-0 text-primary-base" />
        <span className="flex items-center text-sm font-medium text-gray-700">
          {typed}
          <span className="medfind-caret ml-0.5 inline-block h-3.5 w-0.5 bg-primary-base" />
        </span>
        <Check className="ml-auto h-4 w-4 shrink-0 text-primary-base" />
      </div>

      {/* floating nearest-pharmacy result */}
      <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-[#e6f0ea] bg-white/95 p-3 shadow-[0_16px_35px_-18px_rgba(20,83,60,0.5)] backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-hover">
            <MapPin className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">
              Nearest pharmacy
            </p>
            <p className="truncate text-xs text-gray-500">
              {a.area} · {a.dist} away
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary-100 px-2.5 py-1 text-[11px] font-bold text-primary-hover">
            In stock
          </span>
        </div>
      </div>
    </div>
  );
}

// Compact location prompt shown until the client saves a location.
function LocationPrompt() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary-200 bg-primary-100/60 p-5 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-base text-white shadow-[0_10px_22px_-8px_rgba(39,163,118,0.8)]">
          <Navigation className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold text-gray-900">
            Set your location for nearest pharmacies
          </p>
          <p className="mt-0.5 text-sm text-gray-600">
            We use it only to sort pharmacies by distance from you.
          </p>
        </div>
      </div>
      <Button
        asChild
        className="mt-4 w-fit gap-1.5 rounded-xl border border-gray-200 bg-white font-semibold text-gray-900 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-100/40 sm:mt-0"
      >
        <Link href="/profile">
          Set location
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function MedicineCard({
  medicine,
  index,
}: {
  medicine: MedicineResponse;
  index: number;
}) {
  const badges = [medicine.type, medicine.form, medicine.dosage].filter(
    (value): value is string => Boolean(value),
  );
  return (
    <Link
      href={`/find/${medicine.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-[0_24px_45px_-22px_rgba(20,83,60,0.4)] ${ENTER}`}
      style={enterStyle(index * 60)}
    >
      {/* top accent that grows on hover */}
      <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-primary-base transition-transform duration-300 group-hover:scale-x-100" />

      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-hover transition-colors duration-300 group-hover:bg-primary-base group-hover:text-white">
          <Pill className="h-5 w-5" />
        </span>
        <span className="text-right text-sm font-bold text-gray-900">
          {formatPrice(medicine.priceLbp)}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-[15px] font-semibold text-gray-900 transition-colors group-hover:text-primary-hover">
        {medicine.brandName}
      </p>

      {badges.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}

      {medicine.ingredients.length > 0 ? (
        <p className="mt-2 line-clamp-1 text-xs text-gray-500">
          {medicine.ingredients.join(', ')}
        </p>
      ) : null}

      <span className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary-base opacity-0 transition-all duration-300 group-hover:opacity-100">
        View details
        <ArrowRight className="h-3.5 w-3.5 -translate-x-1 transition-transform duration-300 group-hover:translate-x-0" />
      </span>
    </Link>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: PAGE_SIZE }).map((_, index) => (
        <Skeleton key={index} className="h-44 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function FindPage() {
  useApplyPendingLocation();
  const { profile } = useProfile();
  const needsLocation =
    profile != null &&
    (profile.latitude === null || profile.longitude === null);

  const { typed, index } = useTypewriter(EXAMPLES);

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setPage(1);
  }, [debounced]);

  const { medicines, total, isLoading } = useCatalog({
    search: debounced || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages =
    total != null ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Hero: copy + search on the left, the animated map on the right */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className={ENTER} style={enterStyle(0)}>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary-100 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.5px] text-primary-hover shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-base shadow-[0_0_0_3px_rgba(39,163,118,0.18)]" />
            Pharmacy network · Lebanon
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-[38px] sm:leading-[1.08]">
            Find your medicine,{' '}
            <span className="text-primary-base">near you.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-gray-600">
            Search for a medicine by name and see which nearby pharmacies have
            it in stock.
          </p>

          <div className="relative mt-6 max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2 text-primary-base" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search medicines by name…"
              aria-label="Search medicines by name"
              className="h-14 w-full rounded-2xl border border-gray-200 bg-white pr-5 pl-14 text-[15px] text-gray-900 shadow-[0_18px_45px_-24px_rgba(20,83,60,0.35)] outline-none transition-colors placeholder:text-gray-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-400">Popular:</span>
            {POPULAR.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setSearch(term)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-600 transition-colors hover:border-primary-200 hover:text-primary-hover"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`hidden justify-center lg:flex ${ENTER}`}
          style={enterStyle(120)}
        >
          <HeroVisual typed={typed} index={index} />
        </div>
      </section>

      {needsLocation ? (
        <div className={ENTER} style={enterStyle(180)}>
          <LocationPrompt />
        </div>
      ) : null}

      {/* Results */}
      <section className={ENTER} style={enterStyle(240)}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            {debounced ? `Results for "${debounced}"` : 'Browse medicines'}
          </h2>
          {total != null ? (
            <span className="text-sm text-gray-400">
              {total.toLocaleString()} medicine{total === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <ResultsSkeleton />
        ) : medicines && medicines.length > 0 ? (
          <>
            {/* keyed by page so cards re-animate in on each page change */}
            <div key={page} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {medicines.map((medicine, cardIndex) => (
                <MedicineCard
                  key={medicine.id}
                  medicine={medicine}
                  index={cardIndex}
                />
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/60 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Search className="h-6 w-6" />
            </span>
            <p className="mt-3 font-semibold text-gray-900">
              No medicines found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {debounced
                ? `Nothing matched "${debounced}". Try a different name.`
                : 'The catalog is empty right now.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
