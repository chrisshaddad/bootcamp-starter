'use client';

import { cn } from '@/lib/utils';
import { type TechnologyResponse } from '@repo/contracts';
import {
  TECHNOLOGY_CATEGORY_LABELS,
  type TechnologyCategory,
} from '@/lib/mock-projects';

interface TechPickerProps {
  selected: TechnologyResponse[];
  onChange: (technologies: TechnologyResponse[]) => void;
  // Suggestions lists are loaded live from the SWR database catalog
  suggestions: TechnologyResponse[];
}

export function TechPicker({
  selected,
  onChange,
  suggestions,
}: TechPickerProps) {
  const selectedIds = new Set(selected.map((t) => t.id));

  const toggle = (tech: TechnologyResponse) => {
    if (selectedIds.has(tech.id)) {
      onChange(selected.filter((t) => t.id !== tech.id));
    } else {
      onChange([...selected, tech]);
    }
  };

  const byCategory = suggestions.reduce<
    Partial<Record<TechnologyCategory, TechnologyResponse[]>>
  >((acc, tech) => {
    const category = tech.category as TechnologyCategory;
    (acc[category] ??= []).push(tech);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tech) => (
            <button
              key={tech.id}
              type="button"
              onClick={() => toggle(tech)}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
            >
              {tech.name}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}

      {Object.entries(byCategory).map(([category, techs]) => (
        <div key={category} className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {TECHNOLOGY_CATEGORY_LABELS[category as TechnologyCategory]}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {techs
              ?.filter((tech) => !selectedIds.has(tech.id))
              .map((tech) => (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => toggle(tech)}
                  className={cn(
                    'rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground',
                    'hover:border-primary hover:text-primary',
                  )}
                >
                  + {tech.name}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
