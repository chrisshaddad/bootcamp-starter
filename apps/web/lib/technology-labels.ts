import type { TechnologyResponse } from '@repo/contracts';

// real: Technology.category is the actual Prisma enum.
export const TECHNOLOGY_CATEGORY_LABELS: Record<
  TechnologyResponse['category'],
  string
> = {
  LANGUAGE: 'Language',
  FRAMEWORK: 'Framework',
  LIBRARY: 'Library',
  DATABASE: 'Database',
  CLOUD: 'Cloud',
  DEVOPS: 'DevOps',
  TOOL: 'Tool',
  OTHER: 'Other',
};
