'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';

type HeroSectionProps = {
  locale: string;
  eyebrow: string;
  headline: string;
  sub: string;
  ctaLabel: string;
  secondaryLabel: string;
  /** WIRED IN WAVE 3 — fires signIn('keycloak', { callbackUrl: '/{locale}/dashboard' }) */
  onLogin?: () => void;
};

export function HeroSection({
  locale,
  eyebrow,
  headline,
  sub,
  ctaLabel,
  secondaryLabel,
  onLogin, // WIRED IN WAVE 3
}: HeroSectionProps) {
  const reduced = useReducedMotion();
  const isRtl = locale === 'ar';

  function fadeUp(delay: number) {
    return {
      initial: reduced ? { opacity: 0 } : { opacity: 0, y: 28 },
      animate: { opacity: 1, y: 0 },
      transition: reduced
        ? { duration: 0.15, delay: 0 }
        : { duration: 0.65, ease: [0.16, 1, 0.3, 1] as number[], delay },
    };
  }

  function scrollToPlans(e: React.MouseEvent) {
    e.preventDefault();
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      className="relative flex min-h-[96vh] flex-col overflow-hidden"
      style={{ background: '#0D1B2A' }}
      aria-label={isRtl ? 'قسم الترحيب' : 'Hero section'}
    >
      {/* Architectural grid — very subtle 80px mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg,  rgba(201,163,91,0.03) 0px, rgba(201,163,91,0.03) 1px, transparent 1px, transparent 80px),
            repeating-linear-gradient(90deg, rgba(201,163,91,0.03) 0px, rgba(201,163,91,0.03) 1px, transparent 1px, transparent 80px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Warm gold radial glow, off-center for composition */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          insetInlineStart: isRtl ? 'auto' : '50%',
          insetInlineEnd: isRtl ? '50%' : 'auto',
          top: '38%',
          transform: 'translate(-50%, -50%)',
          width: '720px',
          height: '480px',
          background:
            'radial-gradient(ellipse at center, rgba(201,163,91,0.10) 0%, transparent 65%)',
        }}
      />

      {/* Top nav */}
      <nav
        className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10"
        aria-label={isRtl ? 'شريط التنقل' : 'Top navigation'}
      >
        <span
          className="text-sm font-semibold tracking-[0.15em] uppercase"
          style={{ color: 'rgba(201,163,91,0.85)' }}
        >
          Forward Mena
        </span>
        <div className="flex items-center gap-5">
          {/* Log in — WIRED IN WAVE 3 */}
          <button
            onClick={onLogin ?? (() => {})} // WIRED IN WAVE 3
            className="text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A35B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A] rounded"
            style={{ color: 'rgba(245,240,232,0.55)' }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color =
                'rgba(245,240,232,0.9)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color =
                'rgba(245,240,232,0.55)')
            }
          >
            {secondaryLabel}
          </button>
          <LocaleSwitcher currentLocale={locale} />
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-8 text-center">
        {/* Eyebrow */}
        <motion.span
          {...fadeUp(0)}
          className="mb-7 inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-xs font-semibold tracking-[0.18em] uppercase"
          style={{
            background: 'rgba(201,163,91,0.10)',
            border: '1px solid rgba(201,163,91,0.25)',
            color: '#C9A35B',
          }}
        >
          {eyebrow}
        </motion.span>

        {/* Headline block — architectural keyline (the signature element) */}
        <motion.div
          {...fadeUp(0.1)}
          className="relative mx-auto mb-6 max-w-3xl"
          style={{
            paddingInlineStart: '1.5rem',
          }}
        >
          {/* The keyline: single gold vertical rule at the headline start */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              insetInlineStart: 0,
              top: '8%',
              bottom: '8%',
              width: '2px',
              background:
                'linear-gradient(to bottom, transparent, #C9A35B 25%, #C9A35B 75%, transparent)',
              borderRadius: '2px',
            }}
          />
          <h1
            className="text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            style={{ color: '#F5F0E8' }}
          >
            {headline.split('\n').map((line, i) =>
              i === 0 ? (
                line
              ) : (
                <span key={i}>
                  <br />
                  {line}
                </span>
              ),
            )}
          </h1>
        </motion.div>

        <motion.p
          {...fadeUp(0.2)}
          className="mx-auto max-w-lg text-pretty text-base sm:text-lg"
          style={{ color: 'rgba(245,240,232,0.55)', lineHeight: 1.7 }}
        >
          {sub}
        </motion.p>

        <motion.div
          {...fadeUp(0.32)}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          {/* Primary CTA — scrolls to #plans */}
          <button
            onClick={scrollToPlans}
            className="rounded-lg px-7 py-3.5 text-sm font-semibold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A35B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A]"
            style={{
              background: '#C9A35B',
              color: '#0D1B2A',
              boxShadow: '0 0 0 0 rgba(201,163,91,0)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                '#E2C47A';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                '#C9A35B';
            }}
          >
            {ctaLabel}
          </button>

          {/* Secondary — also scrolls to #plans */}
          <button
            onClick={scrollToPlans}
            className="rounded-lg px-5 py-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A35B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A]"
            style={{
              background: 'rgba(245,240,232,0.05)',
              border: '1px solid rgba(245,240,232,0.12)',
              color: 'rgba(245,240,232,0.65)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = 'rgba(245,240,232,0.09)';
              el.style.color = 'rgba(245,240,232,0.9)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = 'rgba(245,240,232,0.05)';
              el.style.color = 'rgba(245,240,232,0.65)';
            }}
          >
            {isRtl ? 'عرض الخطط ←' : 'View plans →'}
          </button>
        </motion.div>
      </div>

      {/* Bottom fade into the features section background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
        style={{
          background:
            'linear-gradient(to bottom, transparent, #0D1B2A 80%, #0F1E2D)',
        }}
      />
    </section>
  );
}
