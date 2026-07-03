'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { MapPin, Activity, Zap, Search, Pill } from 'lucide-react';
import { LebanonMap, CITY_NAMES, type CityKey } from './lebanon-map';

interface Medicine {
  key: string;
  label: string;
  city: CityKey;
  pharmacy: string;
  area: string;
  dist: string;
  stock: string;
  low?: boolean;
}

// Canned demo data — purely illustrative, makes no network calls.
const MEDICINES: Medicine[] = [
  {
    key: 'panadol extra',
    label: 'Panadol Extra',
    city: 'beirut',
    pharmacy: 'Al Salam Pharmacy',
    area: 'Hamra, Beirut',
    dist: '400 m',
    stock: 'In stock',
  },
  {
    key: 'augmentin',
    label: 'Augmentin',
    city: 'tripoli',
    pharmacy: 'Nour Pharmacy',
    area: 'El Mina, Tripoli',
    dist: '1.2 km',
    stock: 'In stock',
  },
  {
    key: 'insulin',
    label: 'Insulin',
    city: 'saida',
    pharmacy: 'Saida Grand Pharmacy',
    area: 'Riad El Solh, Saida',
    dist: '800 m',
    stock: 'Low stock',
    low: true,
  },
  {
    key: 'ventolin',
    label: 'Ventolin',
    city: 'zahle',
    pharmacy: 'Bekaa Care Pharmacy',
    area: 'Manara, Zahle',
    dist: '2.4 km',
    stock: 'In stock',
  },
  {
    key: 'concor',
    label: 'Concor',
    city: 'baalbek',
    pharmacy: 'City Pharmacy',
    area: 'Ras El Ain, Baalbek',
    dist: '3.1 km',
    stock: 'In stock',
  },
];

// Guaranteed fallback so indexed access stays defined under
// noUncheckedIndexedAccess (the array is a non-empty constant).
const DEFAULT_MEDICINE: Medicine = MEDICINES[0] ?? {
  key: '',
  label: '',
  city: 'beirut',
  pharmacy: '',
  area: '',
  dist: '',
  stock: '',
};

const FEATURES = [
  { icon: MapPin, label: 'Nearby stock' },
  { icon: Activity, label: 'Live branches' },
  { icon: Zap, label: 'Instant search' },
];

interface AuthShowcaseProps {
  eyebrow?: string;
  headline?: ReactNode;
  subhead?: string;
}

export function AuthShowcase({
  eyebrow = 'Pharmacy network · Lebanon',
  headline = (
    <>
      Every medicine,{' '}
      <span className="text-primary-base">mapped across Lebanon.</span>
    </>
  ),
  subhead = 'Search a medicine and see exactly which pharmacy has it in stock, and where.',
}: AuthShowcaseProps) {
  // `current` = medicine being typed (drives the chip + typed text).
  // `located` = medicine shown on the map + result (updates once typing finishes).
  const [current, setCurrent] = useState(0);
  const [located, setLocated] = useState(0);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    // Reduced motion: skip the typewriter, just show the first medicine.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(DEFAULT_MEDICINE.label);
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
        const label = (MEDICINES[i] ?? DEFAULT_MEDICINE).label;
        setCurrent(i);
        // type it out, character by character
        for (let c = 1; c <= label.length; c++) {
          if (cancelled) return;
          setTyped(label.slice(0, c));
          await wait(78);
        }
        if (cancelled) return;
        // "search complete" — move the pin/result to this medicine, then hold
        setLocated(i);
        await wait(1500);
        // erase (backspace) before the next one
        for (let c = label.length - 1; c >= 0; c--) {
          if (cancelled) return;
          setTyped(label.slice(0, c));
          await wait(34);
        }
        await wait(240);
        i = (i + 1) % MEDICINES.length;
      }
    };
    void run();

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  const med = MEDICINES[located] ?? DEFAULT_MEDICINE;

  return (
    <div className="max-w-140">
      <span className="inline-flex items-center gap-2 rounded-full border border-[#e2ede7] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.5px] text-primary-hover shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-primary-base shadow-[0_0_0_3px_rgba(39,163,118,0.18)]" />
        {eyebrow}
      </span>

      <h1 className="mt-3.5 mb-2 max-w-[17ch] text-[clamp(24px,2.2vw,31px)] font-extrabold leading-[1.14] tracking-[-0.6px] text-gray-900 text-balance">
        {headline}
      </h1>
      <p className="mb-3.5 max-w-[46ch] text-[14px] leading-relaxed text-gray-600">
        {subhead}
      </p>

      <div className="mb-3.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] font-semibold text-gray-600">
        {FEATURES.map(({ icon: Icon, label }) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <Icon className="h-3.75 w-3.75 text-primary-base" />
            {label}
          </span>
        ))}
      </div>

      {/* Demo card */}
      <div className="rounded-[18px] border border-[#e2ede7] bg-white p-3 shadow-[0_24px_60px_-20px_rgba(20,83,60,0.28),0_6px_16px_rgba(17,24,39,0.06)]">
        <div
          className="flex items-center gap-2.5 rounded-[11px] border border-[#e2ede7] bg-[#f5faf7] px-3 py-2.5"
          aria-hidden="true"
        >
          <Search className="h-4.25 w-4.25 shrink-0 text-primary-base" />
          <span className="flex min-h-5 items-center text-sm font-semibold text-gray-900">
            {typed}
            <span className="medfind-caret ml-0.5 inline-block h-3.75 w-0.5 bg-primary-base" />
          </span>
        </div>

        <div className="mt-2.5 mb-1 flex flex-wrap gap-1.5" aria-hidden="true">
          {MEDICINES.map((m, i) => (
            <span
              key={m.key}
              className={
                i === current
                  ? 'rounded-full bg-primary-base px-2.5 py-1 text-[11.5px] font-bold text-white'
                  : 'rounded-full bg-primary-100 px-2.5 py-1 text-[11.5px] font-bold text-primary-hover transition-colors'
              }
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-2.5">
          <div className="shrink-0">
            <LebanonMap activeCity={med.city} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.3px] text-[#3e9e7c]">
              <MapPin className="h-3.5 w-3.5" />
              <span>{CITY_NAMES[med.city]}</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#e2ede7] bg-[#fbfdfc] p-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-primary-100 text-primary-hover">
                <Pill className="h-4.75 w-4.75" />
              </div>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[13px] font-bold text-gray-900">
                  {med.pharmacy}
                </b>
                <span className="block text-[11px] font-semibold text-gray-400">
                  {med.area} · {med.dist} away
                </span>
              </div>
              <span
                className={
                  med.low
                    ? 'whitespace-nowrap rounded-full bg-[rgba(230,161,20,0.12)] px-2.5 py-1 text-[10.5px] font-extrabold text-[#e6a114]'
                    : 'whitespace-nowrap rounded-full bg-[rgba(12,175,96,0.10)] px-2.5 py-1 text-[10.5px] font-extrabold text-success'
                }
              >
                {med.stock}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
