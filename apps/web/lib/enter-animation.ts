// Shared entrance animation for the admin consoles: sections fade + rise in,
// staggered via an inline animationDelay so they arrive one after another.
export const ENTER = 'animate-in fade-in-0 slide-in-from-bottom-4 duration-500';

// `backwards` fill so the delayed sections stay hidden until their turn instead
// of flashing at full opacity before the animation starts.
export function enterStyle(delayMs: number) {
  return {
    animationDelay: `${delayMs}ms`,
    animationFillMode: 'backwards' as const,
  };
}
