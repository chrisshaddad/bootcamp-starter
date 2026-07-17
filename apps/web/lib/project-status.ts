// real: ProjectStatus is the actual Prisma enum (DRAFT, PUBLISHED, ARCHIVED).
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PUBLISHED: 'bg-success/15 text-success-dark',
  ARCHIVED: 'bg-error/15 text-error-dark',
};
