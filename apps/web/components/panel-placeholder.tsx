import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';

/**
 * Neutral "under construction" landing for panel areas whose real pages haven't
 * been built yet. Lets the foundation ship with working routes + guards so each
 * area's owner just replaces the page body.
 */
export function PanelPlaceholder({
  title,
  description,
  icon: Icon = Construction,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-base">
        <Icon className="h-8 w-8" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{title}</h1>
      <p className="max-w-md text-gray-500">{description}</p>
      <span className="mt-4 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
        Coming soon
      </span>
    </div>
  );
}
