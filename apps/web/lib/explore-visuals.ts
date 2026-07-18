// Deterministic decorative styling for the recruiter-facing explore grid —
// picks from the app's existing chart tokens so every render of the same
// project looks the same without storing a color on the model.

const CHART_VARS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;

const COVER_PAIRS: Array<[string, string]> = [
  [CHART_VARS[0], CHART_VARS[3]],
  [CHART_VARS[2], CHART_VARS[0]],
  [CHART_VARS[3], CHART_VARS[1]],
  [CHART_VARS[4], CHART_VARS[2]],
  [CHART_VARS[2], CHART_VARS[3]],
  [CHART_VARS[3], CHART_VARS[4]],
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCoverGradient(seed: string): string {
  const [from, to] = COVER_PAIRS[hashString(seed) % COVER_PAIRS.length]!;
  return `linear-gradient(135deg, color-mix(in srgb, ${from} 55%, var(--card)), color-mix(in srgb, ${to} 45%, var(--card)))`;
}

export function getAccentColor(seed: string): string {
  return CHART_VARS[hashString(seed) % CHART_VARS.length]!;
}

export function getTechColor(seed: string): string {
  return CHART_VARS[hashString(seed) % CHART_VARS.length]!;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}
