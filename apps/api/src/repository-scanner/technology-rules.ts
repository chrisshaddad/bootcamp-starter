import type { TechnologyDefinition } from './repository-scanner.types';

export const TECHNOLOGIES = {
  react: {
    name: 'React',
    slug: 'react',
    category: 'FRAMEWORK',
  },
  angular: {
    name: 'Angular',
    slug: 'angular',
    category: 'FRAMEWORK',
  },
  nestjs: {
    name: 'NestJS',
    slug: 'nestjs',
    category: 'FRAMEWORK',
  },
  express: {
    name: 'Express',
    slug: 'express',
    category: 'FRAMEWORK',
  },
  nextjs: {
    name: 'Next.js',
    slug: 'nextjs',
    category: 'FRAMEWORK',
  },
  postgresql: {
    name: 'PostgreSQL',
    slug: 'postgresql',
    category: 'DATABASE',
  },
  mongodb: {
    name: 'MongoDB',
    slug: 'mongodb',
    category: 'DATABASE',
  },
  mysql: {
    name: 'MySQL',
    slug: 'mysql',
    category: 'DATABASE',
  },
  sqlite: {
    name: 'SQLite',
    slug: 'sqlite',
    category: 'DATABASE',
  },
  redis: {
    name: 'Redis',
    slug: 'redis',
    category: 'DATABASE',
  },
  docker: {
    name: 'Docker',
    slug: 'docker',
    category: 'DEVOPS',
  },
  dockerCompose: {
    name: 'Docker Compose',
    slug: 'docker-compose',
    category: 'DEVOPS',
  },
  prisma: {
    name: 'Prisma',
    slug: 'prisma',
    category: 'TOOL',
  },
  tailwindcss: {
    name: 'Tailwind CSS',
    slug: 'tailwindcss',
    category: 'FRAMEWORK',
  },
  vite: {
    name: 'Vite',
    slug: 'vite',
    category: 'TOOL',
  },
  githubActions: {
    name: 'GitHub Actions',
    slug: 'github-actions',
    category: 'DEVOPS',
  },
} as const satisfies Record<string, TechnologyDefinition>;

export interface PackageDependencyRule {
  packageNames: string[];
  technology: TechnologyDefinition;
}

export interface PackageScriptRule {
  commandPattern: RegExp;
  technology: TechnologyDefinition;
}

export interface TextSignalRule {
  textPattern: RegExp;
  technology: TechnologyDefinition;
}

export const PACKAGE_DEPENDENCY_RULES: PackageDependencyRule[] = [
  { packageNames: ['react'], technology: TECHNOLOGIES.react },
  { packageNames: ['@angular/core'], technology: TECHNOLOGIES.angular },
  { packageNames: ['@nestjs/core'], technology: TECHNOLOGIES.nestjs },
  { packageNames: ['express'], technology: TECHNOLOGIES.express },
  { packageNames: ['next'], technology: TECHNOLOGIES.nextjs },
  {
    packageNames: ['@prisma/client', 'prisma'],
    technology: TECHNOLOGIES.prisma,
  },
  { packageNames: ['mongoose'], technology: TECHNOLOGIES.mongodb },
  { packageNames: ['pg'], technology: TECHNOLOGIES.postgresql },
  { packageNames: ['mysql2'], technology: TECHNOLOGIES.mysql },
  { packageNames: ['redis', 'ioredis'], technology: TECHNOLOGIES.redis },
  { packageNames: ['tailwindcss'], technology: TECHNOLOGIES.tailwindcss },
  { packageNames: ['vite'], technology: TECHNOLOGIES.vite },
];

export const PACKAGE_SCRIPT_RULES: PackageScriptRule[] = [
  { commandPattern: /\bnext\b/, technology: TECHNOLOGIES.nextjs },
  { commandPattern: /\bvite\b/, technology: TECHNOLOGIES.vite },
  { commandPattern: /\bprisma\b/, technology: TECHNOLOGIES.prisma },
  { commandPattern: /\btailwindcss\b/, technology: TECHNOLOGIES.tailwindcss },
];

export const DOCKER_COMPOSE_IMAGE_RULES: TextSignalRule[] = [
  {
    textPattern: /\bimage:\s*["']?[^"'\n]*postgres/i,
    technology: TECHNOLOGIES.postgresql,
  },
  {
    textPattern: /\bimage:\s*["']?[^"'\n]*mongo/i,
    technology: TECHNOLOGIES.mongodb,
  },
  {
    textPattern: /\bimage:\s*["']?[^"'\n]*mysql/i,
    technology: TECHNOLOGIES.mysql,
  },
  {
    textPattern: /\bimage:\s*["']?[^"'\n]*redis/i,
    technology: TECHNOLOGIES.redis,
  },
];

export const PRISMA_PROVIDER_RULES: Record<string, TechnologyDefinition> = {
  postgresql: TECHNOLOGIES.postgresql,
  mongodb: TECHNOLOGIES.mongodb,
  mysql: TECHNOLOGIES.mysql,
  sqlite: TECHNOLOGIES.sqlite,
};

export const LANGUAGE_SLUG_OVERRIDES: Record<string, string> = {
  'c#': 'csharp',
  'c++': 'cpp',
  'f#': 'fsharp',
};
