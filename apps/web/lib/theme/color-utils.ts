const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

interface Hsl {
  h: number;
  s: number;
  l: number;
}

export interface ThemeTokens {
  primary: string;
  'primary-foreground': string;
  'primary-base': string;
  'primary-400': string;
  'primary-300': string;
  'primary-200': string;
  'primary-100': string;
  accent: string;
  'accent-foreground': string;
  ring: string;
  'sidebar-primary': string;
  'sidebar-primary-foreground': string;
  'sidebar-accent': string;
  'sidebar-accent-foreground': string;
  'sidebar-ring': string;
  'chart-1': string;
}

/** Whether a string is a valid #RRGGBB hex color */
export function isValidHex(value: string): boolean {
  return HEX_PATTERN.test(value);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) {
    h = 60 * (((gn - bn) / delta) % 6);
  } else if (max === gn) {
    h = 60 * ((bn - rn) / delta + 2);
  } else {
    h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }: Hsl): string {
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return rgbToHex((rp + m) * 255, (gp + m) * 255, (bp + m) * 255);
}

/** WCAG relative luminance (0-1) */
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two hex colors (1-21) */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Picks whichever of white / near-black gives better contrast against the given color */
export function pickForeground(hex: string): string {
  const white = '#ffffff';
  const nearBlack = '#111827';
  return contrastRatio(hex, white) >= contrastRatio(hex, nearBlack)
    ? white
    : nearBlack;
}

function tint(
  hsl: Hsl,
  lightenFraction: number,
  saturationFactor: number,
): string {
  return hslToHex({
    h: hsl.h,
    s: Math.max(20, hsl.s * saturationFactor),
    l: hsl.l + (100 - hsl.l) * lightenFraction,
  });
}

function darkAccent(hsl: Hsl): string {
  return hslToHex({
    h: hsl.h,
    s: Math.min(95, hsl.s + 25),
    l: Math.max(18, hsl.l - 6),
  });
}

/**
 * Derives the full recolored token group (light + dark) from one seed hex.
 * Mirrors the ratios of the site's existing default green palette so any
 * chosen brand color produces a ramp with the same visual weight.
 */
export function deriveThemeTokens(hex: string): {
  light: ThemeTokens;
  dark: ThemeTokens;
} {
  const hsl = hexToHsl(hex);
  const foreground = pickForeground(hex);

  const base400 = tint(hsl, 0.35, 0.85);
  const base300 = tint(hsl, 0.55, 0.85);
  const base200 = tint(hsl, 0.78, 0.8);
  const base100 = tint(hsl, 0.9, 0.75);
  const darkAccentHex = darkAccent(hsl);
  const darkAccentForeground = pickForeground(darkAccentHex);

  const light: ThemeTokens = {
    primary: hex,
    'primary-foreground': foreground,
    'primary-base': hex,
    'primary-400': base400,
    'primary-300': base300,
    'primary-200': base200,
    'primary-100': base100,
    accent: base100,
    'accent-foreground': hex,
    ring: hex,
    'sidebar-primary': hex,
    'sidebar-primary-foreground': foreground,
    'sidebar-accent': base100,
    'sidebar-accent-foreground': hex,
    'sidebar-ring': hex,
    'chart-1': hex,
  };

  const dark: ThemeTokens = {
    primary: hex,
    'primary-foreground': foreground,
    'primary-base': hex,
    'primary-400': base400,
    'primary-300': base300,
    'primary-200': base200,
    'primary-100': base100,
    accent: darkAccentHex,
    'accent-foreground': darkAccentForeground,
    ring: hex,
    'sidebar-primary': hex,
    'sidebar-primary-foreground': foreground,
    'sidebar-accent': darkAccentHex,
    'sidebar-accent-foreground': darkAccentForeground,
    'sidebar-ring': hex,
    'chart-1': base400,
  };

  return { light, dark };
}
