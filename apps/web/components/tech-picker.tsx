'use client';

import { cn } from '@/lib/utils';
import { TECHNOLOGY_CATEGORY_LABELS } from '@/lib/technology-labels';
import type { TechnologyResponse } from '@repo/contracts';

interface TechPickerProps {
  selected: TechnologyResponse[];
  onChange: (technologies: TechnologyResponse[]) => void;
  // Suggestion list to offer below the selected chips — e.g. pass [] once
  // technologies were populated from a real GitHub language fetch, since
  // the global catalog has nothing to do with that repo and would be
  // misleading to offer alongside it.
  suggestions: TechnologyResponse[];
}

// real: suggestions come from GET /technologies (see useTechnologies).
// mock: ProjectTechnology still has no add/remove endpoint, so selections
// made here aren't persisted anywhere yet.
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
    Partial<Record<TechnologyResponse['category'], TechnologyResponse[]>>
  >((acc, tech) => {
    (acc[tech.category] ??= []).push(tech);
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
            {
              TECHNOLOGY_CATEGORY_LABELS[
                category as TechnologyResponse['category']
              ]
            }
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
