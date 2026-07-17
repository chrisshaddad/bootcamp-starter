'use client';

import { Github, Linkedin, X } from 'lucide-react';
//import { toast } from 'sonner';

const LEGAL_LINKS = [
  {
    label: 'Privacy Policy',
    onClick: () =>
      window.open(
        'https://mohamadbakawi.github.io/ForwardMena-Project-Privacy-Policy/',
        '_blank',
        'noopener,noreferrer',
      ),
  },
];

const SOCIAL_LINKS = [
  {
    label: 'GitHub',
    icon: Github,
    onClick: () =>
      window.open(
        'https://github.com/chrisshaddad/bootcamp-starter/tree/mhmdfarhat-mhmdali-amir',
        '_blank',
        'noopener,noreferrer',
      ),
  },
  {
    label: 'LinkedIn',
    icon: Linkedin,
    onClick: () =>
      window.open('https://www.linkedin.com/', '_blank', 'noopener,noreferrer'),
  },
  {
    label: 'X',
    icon: X,
    onClick: () =>
      window.open('https://x.com/', '_blank', 'noopener,noreferrer'),
  },
];

export function SiteFooter() {
  return (
    <footer className="flex w-full flex-col items-center gap-4 px-6 py-8 sm:flex-row sm:justify-between sm:px-10">
      <p className="text-sm text-muted-foreground">
        © {new Date().getFullYear()} Deployfolio. All rights reserved.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4 sm:flex-nowrap sm:gap-6">
        {LEGAL_LINKS.map(({ label, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {label}
          </button>
        ))}

        <div className="flex items-center gap-3">
          {SOCIAL_LINKS.map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={onClick}
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
