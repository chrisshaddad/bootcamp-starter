'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumber,
  type CountryCode,
} from 'libphonenumber-js';
import * as Flags from 'country-flag-icons/react/3x2';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

// MedFind is a Lebanon platform, so default to 🇱🇧 +961 rather than a US format.
const DEFAULT_COUNTRY: CountryCode = 'LB';

// Resolve English country names in the browser without shipping a name table.
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

interface Country {
  code: CountryCode;
  callingCode: string;
  name: string;
}

// Built once: every country libphonenumber-js knows, with its dial code and
// English name, sorted alphabetically for the combobox.
const COUNTRIES: Country[] = getCountries()
  .map((code) => ({
    code,
    callingCode: getCountryCallingCode(code),
    name: regionNames.of(code) ?? code,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

type FlagComponent = React.ComponentType<{
  className?: string;
  title?: string;
}>;

function FlagIcon({
  code,
  className,
}: {
  code: CountryCode;
  className?: string;
}) {
  const Flag = (Flags as Record<string, FlagComponent>)[code];
  if (!Flag) {
    return <span className={cn('inline-block bg-gray-200', className)} />;
  }
  return <Flag className={className} title={code} />;
}

// Best-effort E.164 for a national number + country. Falls back to
// `+<cc><digits>` for partial input so the value still round-trips; final
// validity is enforced separately (isValidPhoneNumber) on submit.
function toE164(national: string, country: CountryCode): string {
  const digits = national.replace(/\D/g, '');
  if (!digits) return '';
  try {
    return parsePhoneNumber(digits, country).number;
  } catch {
    return `+${getCountryCallingCode(country)}${digits}`;
  }
}

/**
 * International phone field: a searchable country selector (flag + dial code)
 * plus a national-number input that formats as you type. Controlled — `value`
 * is a normalized E.164 string (e.g. `+9611234567`) and only the display is
 * country-formatted. Defaults to Lebanon.
 */
export function PhoneInput({
  value,
  onChange,
  onBlur,
  id,
  invalid,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  invalid?: boolean;
  placeholder?: string;
}) {
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [national, setNational] = useState('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  // The last E.164 we emitted, so an external `value` echo doesn't clobber the
  // in-progress national input (which would fight the user's cursor).
  const lastEmitted = useRef<string>('');

  // Sync display state from an external value (initial load / form reset).
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    if (!value) {
      setNational('');
      return;
    }
    try {
      const parsed = parsePhoneNumber(value);
      setCountry(parsed.country ?? DEFAULT_COUNTRY);
      setNational(parsed.formatNational());
    } catch {
      setNational(value);
    }
  }, [value]);

  // Close the country popup on outside click.
  useEffect(() => {
    if (!open) return;
    function handle(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const emit = (nextNational: string, nextCountry: CountryCode) => {
    const e164 = toE164(nextNational, nextCountry);
    lastEmitted.current = e164;
    onChange(e164);
  };

  const handleNationalChange = (raw: string) => {
    // A fresh AsYouType per keystroke, fed the whole string, is the standard
    // controlled-input pattern (the formatter is stateful otherwise).
    const formatted = new AsYouType(country).input(raw);
    setNational(formatted);
    emit(formatted, country);
  };

  const chooseCountry = (next: CountryCode) => {
    setCountry(next);
    setOpen(false);
    setQuery('');
    const formatted = new AsYouType(next).input(national.replace(/\D/g, ''));
    setNational(formatted);
    emit(formatted, next);
  };

  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? COUNTRIES.filter(
        (item) =>
          item.name.toLowerCase().includes(needle) ||
          item.callingCode.includes(needle.replace(/^\+/, '')) ||
          item.code.toLowerCase() === needle,
      )
    : COUNTRIES;
  // Cap the rendered list so the popup stays snappy; search narrows the rest.
  const shown = filtered.slice(0, 60);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'flex h-9 w-full items-stretch overflow-hidden rounded-md border border-gray-200 bg-white focus-within:border-primary-base focus-within:ring-2 focus-within:ring-primary-200',
          invalid &&
            'border-error focus-within:border-error focus-within:ring-error/20',
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label="Select country calling code"
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex shrink-0 items-center gap-1.5 border-r border-gray-200 px-2.5 text-sm text-gray-700 outline-none hover:bg-gray-50"
        >
          <FlagIcon
            code={country}
            className="h-3.5 w-5 rounded-[2px] object-cover"
          />
          <span className="text-gray-500">
            +{getCountryCallingCode(country)}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          value={national}
          onChange={(event) => handleNationalChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder ?? 'Phone number'}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
      </div>

      {open ? (
        <div className="absolute z-50 mt-1 w-72 overflow-hidden rounded-[10px] border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
                placeholder="Search country or code…"
                className="h-8 pl-8"
              />
            </div>
          </div>
          <ul className="thin-scroll max-h-64 overflow-y-auto p-1">
            {shown.map((item) => (
              <li key={item.code}>
                <button
                  type="button"
                  onClick={() => chooseCountry(item.code)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-gray-100"
                >
                  <FlagIcon
                    code={item.code}
                    className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-gray-900">
                    {item.name}
                  </span>
                  <span className="shrink-0 text-gray-400">
                    +{item.callingCode}
                  </span>
                  {item.code === country ? (
                    <Check className="h-4 w-4 shrink-0 text-primary-base" />
                  ) : null}
                </button>
              </li>
            ))}
            {shown.length === 0 ? (
              <li className="px-2.5 py-2 text-sm text-gray-400">No matches</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
