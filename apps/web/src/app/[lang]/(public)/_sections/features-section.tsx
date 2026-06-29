'use client';

import { motion, useReducedMotion } from 'framer-motion';

type Feature = {
  icon: string;
  title: string;
  desc: string;
};

type FeaturesSectionProps = {
  title: string;
  sub: string;
  features: Feature[];
  locale?: string;
};

export function FeaturesSection({
  title,
  sub,
  features,
  locale,
}: FeaturesSectionProps) {
  const reduced = useReducedMotion();
  const isRtl = locale === 'ar';

  function stagger(i: number) {
    return {
      initial: reduced ? { opacity: 0 } : { opacity: 0, y: 20 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: '-60px' },
      transition: reduced
        ? { duration: 0.15 }
        : {
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1] as number[],
            delay: i * 0.07,
          },
    };
  }

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      className="py-24"
      style={{ background: '#0F1E2D' }}
      aria-label={isRtl ? 'الميزات' : 'Features'}
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={
            reduced
              ? { duration: 0.15 }
              : { duration: 0.5, ease: [0.16, 1, 0.3, 1] as number[] }
          }
          className="mb-14 text-center"
        >
          {/* Hairline divider above heading */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <span
              aria-hidden="true"
              className="h-px flex-1 max-w-[80px]"
              style={{ background: 'rgba(201,163,91,0.3)' }}
            />
            <span
              className="text-xs font-semibold tracking-[0.2em] uppercase"
              style={{ color: '#C9A35B' }}
            >
              {isRtl ? 'المنصة' : 'Platform'}
            </span>
            <span
              aria-hidden="true"
              className="h-px flex-1 max-w-[80px]"
              style={{ background: 'rgba(201,163,91,0.3)' }}
            />
          </div>
          <h2
            className="text-balance text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: '#F5F0E8' }}
          >
            {title}
          </h2>
          <p
            className="mt-4 text-base max-w-xl mx-auto"
            style={{ color: 'rgba(245,240,232,0.5)', lineHeight: 1.7 }}
          >
            {sub}
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              {...stagger(i)}
              className="group relative rounded-xl p-6 transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(201,163,91,0.06)';
                el.style.borderColor = 'rgba(201,163,91,0.2)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(255,255,255,0.03)';
                el.style.borderColor = 'rgba(255,255,255,0.07)';
              }}
            >
              {/* Icon */}
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                style={{
                  background: 'rgba(201,163,91,0.10)',
                  border: '1px solid rgba(201,163,91,0.18)',
                }}
                aria-hidden="true"
              >
                {f.icon}
              </div>
              <h3
                className="mb-2 font-semibold text-sm tracking-wide"
                style={{ color: '#F5F0E8' }}
              >
                {f.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'rgba(245,240,232,0.48)' }}
              >
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
