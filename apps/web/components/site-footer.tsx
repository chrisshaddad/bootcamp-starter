'use client';

import { Github, Linkedin, Twitter } from 'lucide-react';
import { toast } from 'sonner';

const LEGAL_LINKS = ['Privacy Policy', 'Terms of Service'];
const SOCIAL_LINKS = [
  { label: 'GitHub', icon: Github },
  { label: 'LinkedIn', icon: Linkedin },
  { label: 'X', icon: Twitter },
];

function notifyComingSoon(label: string) {
  toast.info(`${label}: this feature isn't implemented yet.`);
}

export function SiteFooter() {
  return (
    <footer className="flex w-full flex-col items-center gap-4 px-6 py-8 sm:flex-row sm:justify-between sm:px-10">
      <p className="text-sm text-muted-foreground">
        © {new Date().getFullYear()} Deployfolio. All rights reserved.
      </p>

      <div className="flex items-center gap-6">
        {LEGAL_LINKS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => notifyComingSoon(label)}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {label}
          </button>
        ))}

        <div className="flex items-center gap-3">
          {SOCIAL_LINKS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => notifyComingSoon(label)}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
}
