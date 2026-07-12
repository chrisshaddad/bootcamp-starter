// real: ProjectStatus is the actual Prisma enum (DRAFT, PUBLISHED, ARCHIVED).
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PUBLISHED: 'bg-green-500/15 text-green-300',
  ARCHIVED: 'bg-red-500/15 text-red-300',
};
