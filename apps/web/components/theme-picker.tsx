'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, Loader2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/hooks/use-auth';
import { useGymTheme } from '@/hooks/use-gym-theme';
import {
  applyTheme,
  getPresetHex,
  THEME_PRESETS,
} from '@/lib/theme/apply-theme';
import { isValidHex } from '@/lib/theme/color-utils';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const DEFAULT_HEX = '#27a376';

export function ThemePicker() {
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const { updateThemeColor } = useGymTheme();

  const savedHex = user?.gymThemeColor ?? null;
  // What's currently previewed (may not be saved yet).
  const [previewHex, setPreviewHex] = useState<string | null>(savedHex);
  const [hexInput, setHexInput] = useState(savedHex ?? DEFAULT_HEX);
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);

  // Preset hex values are read from CSS custom properties, which requires
  // the DOM — resolve once after mount and cache them instead of calling
  // getComputedStyle() during render (unsafe on the server, wasteful on the
  // client).
  const [presetHexes, setPresetHexes] = useState<Record<string, string>>({});
  useEffect(() => {
    const hexes: Record<string, string> = {};
    for (const preset of THEME_PRESETS) {
      hexes[preset.slug] = getPresetHex(preset.cssVar);
    }
    setPresetHexes(hexes);
  }, []);

  // Sync local state when the saved value changes from outside this component
  // (e.g. after a successful save refreshes /auth/me, or on first load).
  useEffect(() => {
    if (initialized.current && previewHex === savedHex) return;
    initialized.current = true;
    setPreviewHex(savedHex);
    setHexInput(savedHex ?? DEFAULT_HEX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedHex]);

  const isDirty = previewHex !== savedHex;

  const handlePreview = (hex: string) => {
    setPreviewHex(hex);
    setHexInput(hex);
    applyTheme(hex);
  };

  const handlePresetClick = (slug: string) => {
    const hex = presetHexes[slug];
    if (hex) handlePreview(hex);
  };

  const handleHexInputChange = (value: string) => {
    setHexInput(value);
    if (isValidHex(value)) {
      setPreviewHex(value);
      applyTheme(value);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateThemeColor(previewHex);
      toast.success('Theme updated');
    } catch (err) {
      // Revert the live preview to the last-saved color on failure.
      applyTheme(savedHex);
      setPreviewHex(savedHex);
      setHexInput(savedHex ?? DEFAULT_HEX);
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to update theme',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await updateThemeColor(null);
      toast.success('Theme reset to default');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to reset theme',
      );
    } finally {
      setSaving(false);
    }
  };

  const currentHex = previewHex ?? DEFAULT_HEX;

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium text-gray-900">Brand color</Label>
        <p className="mt-1 text-sm text-gray-500">
          Pick a color to recolor buttons, links, and accents across your
          dashboard and member portal. Everyone at your gym sees this color.
        </p>
      </div>

      <div className="grid grid-cols-6 gap-3 sm:grid-cols-12">
        {THEME_PRESETS.map((preset) => {
          const presetHex = presetHexes[preset.slug];
          const isSelected =
            !!presetHex &&
            previewHex?.toLowerCase() === presetHex.toLowerCase();
          return (
            <button
              key={preset.slug}
              type="button"
              aria-label={`${preset.label} theme`}
              title={preset.label}
              onClick={() => handlePresetClick(preset.slug)}
              className="group flex flex-col items-center gap-1"
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 transition-transform group-hover:scale-105',
                  isSelected ? 'ring-gray-900' : 'ring-transparent',
                )}
                style={{ backgroundColor: `var(${preset.cssVar})` }}
              >
                {isSelected && (
                  <Check className="h-4 w-4 text-white drop-shadow" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-end gap-3 border-t border-gray-200 pt-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="custom-theme-color" className="text-xs text-gray-500">
            Custom color
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Custom color picker"
              value={isValidHex(hexInput) ? hexInput : DEFAULT_HEX}
              onChange={(e) => handleHexInputChange(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded border border-gray-300 p-0.5"
            />
            <Input
              id="custom-theme-color"
              value={hexInput}
              onChange={(e) => handleHexInputChange(e.target.value)}
              placeholder="#27A376"
              maxLength={7}
              className={cn(
                'w-28 font-mono uppercase',
                !isValidHex(hexInput) && 'border-destructive',
              )}
            />
          </div>
          {!isValidHex(hexInput) && (
            <p className="text-body-xs-regular text-destructive">
              Use #RRGGBB format
            </p>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span
            className="h-9 w-9 shrink-0 rounded-full border border-gray-200"
            style={{ backgroundColor: currentHex }}
            aria-hidden
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={saving || (savedHex === null && !isDirty)}
          >
            Reset to default
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty || !isValidHex(previewHex ?? '')}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Palette className="h-4 w-4" />
            )}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
