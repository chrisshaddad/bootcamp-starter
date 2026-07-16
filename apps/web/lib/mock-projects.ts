// mock: Technology, Repository, ProjectMedia, and ProjectMember have real
// Prisma models but no API endpoints yet. This fixture data mirrors the
// exact fields/enums in packages/database/prisma/schema.prisma (and the
// seeded rows in packages/database/prisma/seeders/seedProjects.ts) so the
// shape won't change when the real endpoints ship — only the data source
// (this file) gets swapped for a real fetch.

export type TechnologyCategory =
  | 'LANGUAGE'
  | 'FRAMEWORK'
  | 'LIBRARY'
  | 'DATABASE'
  | 'CLOUD'
  | 'DEVOPS'
  | 'TOOL'
  | 'OTHER';

export interface MockTechnology {
  id: string;
  name: string;
  slug: string;
  category: TechnologyCategory;
}

// Mirrors the technologies upserted in seedProjects.ts
export const MOCK_TECHNOLOGIES: MockTechnology[] = [
  {
    id: 'tech-typescript',
    name: 'TypeScript',
    slug: 'typescript',
    category: 'LANGUAGE',
  },
  { id: 'tech-nodejs', name: 'Node.js', slug: 'nodejs', category: 'LANGUAGE' },
  { id: 'tech-nestjs', name: 'NestJS', slug: 'nestjs', category: 'FRAMEWORK' },
  { id: 'tech-nextjs', name: 'Next.js', slug: 'nextjs', category: 'FRAMEWORK' },
  {
    id: 'tech-postgresql',
    name: 'PostgreSQL',
    slug: 'postgresql',
    category: 'DATABASE',
  },
  { id: 'tech-redis', name: 'Redis', slug: 'redis', category: 'DATABASE' },
  { id: 'tech-docker', name: 'Docker', slug: 'docker', category: 'DEVOPS' },
];

export const TECHNOLOGY_CATEGORY_LABELS: Record<TechnologyCategory, string> = {
  LANGUAGE: 'Language',
  FRAMEWORK: 'Framework',
  LIBRARY: 'Library',
  DATABASE: 'Database',
  CLOUD: 'Cloud',
  DEVOPS: 'DevOps',
  TOOL: 'Tool',
  OTHER: 'Other',
};

// mock: there's no "list my repos" endpoint (GitHub linking hasn't shipped),
// so repositoryId is entered manually. These fullNames exist for reference —
// `sarahchen/manual-project-test-api` is seeded specifically for this
// (see seedProjects.ts `availableRepositories`) — but real repository UUIDs
// differ per environment, so we can't hardcode a working id here. Look yours
// up with `npx prisma studio` (Repository table) after seeding.
export const KNOWN_SEEDED_REPOSITORIES = [
  {
    fullName: 'sarahchen/manual-project-test-api',
    note: 'Seeded and unlinked — available to create a project against, owned by dev.sarah@example.com',
  },
  {
    fullName: 'sarahchen/enterprise-nest-api',
    note: 'Seeded but already linked to a project',
  },
];

export interface MockProjectCard {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  fullDescription: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  deploymentUrl: string | null;
  repositoryFullName: string;
  technologies: MockTechnology[];
  isMock: true;
}

// mock: no GET /projects (list) endpoint yet — these stand in for "my
// projects" on the grid until it ships.
export const MOCK_PROJECTS: MockProjectCard[] = [
  {
    id: 'mock-project-1',
    title: 'Enterprise NestJS Boilerplate',
    slug: 'enterprise-nestjs-boilerplate',
    shortDescription:
      'A production-ready NestJS API boilerplate with advanced caching and background workers.',
    fullDescription:
      'This project demonstrates industry-grade patterns for Node.js, leveraging PostgreSQL with Prisma, Redis with BullMQ, and Docker containerization.',
    status: 'PUBLISHED',
    deploymentUrl: 'https://api-demo.sarahchen.dev',
    repositoryFullName: 'sarahchen/enterprise-nest-api',
    technologies: MOCK_TECHNOLOGIES.filter((t) =>
      ['typescript', 'nestjs', 'postgresql', 'redis', 'docker'].includes(
        t.slug,
      ),
    ),
    isMock: true,
  },
  {
    id: 'mock-project-2',
    title: 'Tailwind v4 Sandbox',
    slug: 'tailwindcss-v4-sandbox',
    shortDescription:
      'An experimental Next.js layout showcasing Tailwind CSS v4 features.',
    fullDescription:
      'Explore the new compilation engine, custom utilities, and CSS-first configuration features of Tailwind v4.',
    status: 'DRAFT',
    deploymentUrl: null,
    repositoryFullName: 'sarahchen/tailwindcss-v4-playground',
    technologies: MOCK_TECHNOLOGIES.filter((t) =>
      ['typescript', 'nextjs'].includes(t.slug),
    ),
    isMock: true,
  },
];
