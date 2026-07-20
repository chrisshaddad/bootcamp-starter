'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDarkModeContext } from '@/components/dark-mode-provider';

/** Dark mode toggle button with animated icon swap. Shows Sun/Moon/Monitor based on current mode. */
export function DarkModeToggle() {
  const { mode, toggle } = useDarkModeContext();

  const icon =
    mode === 'light' ? (
      <Sun className="h-4 w-4 text-amber-500 transition-transform duration-200 hover:rotate-12" />
    ) : mode === 'dark' ? (
      <Moon className="h-4 w-4 text-blue-400 transition-transform duration-200 hover:-rotate-12" />
    ) : (
      <Monitor className="h-4 w-4 text-gray-500 transition-transform duration-200" />
    );

  const label =
    mode === 'light' ? 'Light mode' : mode === 'dark' ? 'Dark mode' : 'System';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-9 w-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={`Theme: ${label}. Click to change.`}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
