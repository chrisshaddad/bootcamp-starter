import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

export function ComingSoon({
  title,
  description = "This screen isn't built yet. Check back soon.",
  icon: Icon = Construction,
}: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <Icon className="h-6 w-6 text-gray-400" />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <span className="mt-4 inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-base">
        Coming soon
      </span>
    </div>
  );
}
