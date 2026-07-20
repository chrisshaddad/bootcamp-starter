interface ProjectCoverPlaceholderProps {
  title: string;
  logoUrl: string | null;
}

function getProjectInitials(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  return words.length > 1
    ? `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}`.toUpperCase()
    : (words[0]?.slice(0, 2) ?? '?').toUpperCase();
}

export function ProjectCoverPlaceholder({
  title,
  logoUrl,
}: ProjectCoverPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={`${title} has no cover image`}
      className="bg-muted/35 relative flex h-full items-center justify-center overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage:
            'linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)',
        }}
      />

      <div className="bg-card/95 relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border shadow-sm transition-transform duration-200 group-hover:scale-105">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-muted-foreground text-sm font-bold tracking-wide">
            {getProjectInitials(title)}
          </span>
        )}
      </div>
    </div>
  );
}
