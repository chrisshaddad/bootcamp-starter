import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="size-full" fill="none">
        <defs>
          <linearGradient id="margin-logo" x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="#936BFF" />
            <stop offset="0.55" stopColor="#7C4DFF" />
            <stop offset="1" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#margin-logo)" />
        {/* upward margin trend */}
        <path
          d="M8 21.5 L13.5 15.5 L18 19 L24.5 11"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24.5" cy="11" r="2" fill="white" />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showWordmark && (
        <span className="text-lg font-bold tracking-tight text-foreground">
          Margin
        </span>
      )}
    </span>
  );
}
