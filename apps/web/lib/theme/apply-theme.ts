import { deriveThemeTokens, isValidHex, type ThemeTokens } from './color-utils';

const STYLE_TAG_ID = 'gym-theme-overrides';

/** 13 gym-relevant presets. Hex values live in globals.css (--theme-preset-*), never hardcoded here. */
export const THEME_PRESETS = [
  { slug: 'garnet', label: 'Garnet', cssVar: '--theme-preset-garnet' },
  { slug: 'green', label: 'Green', cssVar: '--theme-preset-green' },
  { slug: 'blue', label: 'Blue', cssVar: '--theme-preset-blue' },
  { slug: 'purple', label: 'Purple', cssVar: '--theme-preset-purple' },
  { slug: 'orange', label: 'Orange', cssVar: '--theme-preset-orange' },
  { slug: 'crimson', label: 'Crimson', cssVar: '--theme-preset-crimson' },
  { slug: 'teal', label: 'Teal', cssVar: '--theme-preset-teal' },
  { slug: 'indigo', label: 'Indigo', cssVar: '--theme-preset-indigo' },
  { slug: 'pink', label: 'Pink', cssVar: '--theme-preset-pink' },
  { slug: 'amber', label: 'Amber', cssVar: '--theme-preset-amber' },
  { slug: 'cyan', label: 'Cyan', cssVar: '--theme-preset-cyan' },
  { slug: 'lime', label: 'Lime', cssVar: '--theme-preset-lime' },
  { slug: 'slate', label: 'Slate', cssVar: '--theme-preset-slate' },
] as const;

/** Reads a preset's resolved hex value from its globals.css custom property */
export function getPresetHex(cssVar: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
}

function buildRuleBlock(selector: string, tokens: ThemeTokens): string {
  const declarations = Object.entries(tokens)
    .map(([name, value]) => `--${name}: ${value};`)
    .join(' ');
  return `${selector} { ${declarations} }`;
}

/**
 * Applies (or clears) the gym's brand color by injecting/removing a single
 * <style> tag that overrides the recolored token group. `hex === null`
 * removes the tag, falling back to globals.css defaults.
 */
export function applyTheme(hex: string | null): void {
  const existing = document.getElementById(STYLE_TAG_ID);

  if (!hex || !isValidHex(hex)) {
    existing?.remove();
    return;
  }

  const { light, dark } = deriveThemeTokens(hex);
  const css = [
    buildRuleBlock(':root', light),
    buildRuleBlock('.dark', dark),
  ].join('\n');

  const styleTag = existing ?? document.createElement('style');
  styleTag.id = STYLE_TAG_ID;
  styleTag.textContent = css;
  if (!existing) {
    document.head.appendChild(styleTag);
  }
}
