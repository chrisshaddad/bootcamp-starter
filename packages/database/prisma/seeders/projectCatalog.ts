export const legacySeedRepositoryIds = [
  BigInt(83921102),
  BigInt(94301292),
  BigInt(77770001),
];

export const technologySeeds = [
  { name: 'TypeScript', slug: 'typescript', category: 'LANGUAGE' as const },
  { name: 'JavaScript', slug: 'javascript', category: 'LANGUAGE' as const },
  { name: 'Node.js', slug: 'nodejs', category: 'LANGUAGE' as const },
  { name: 'MDX', slug: 'mdx', category: 'LANGUAGE' as const },
  { name: 'React', slug: 'react', category: 'FRAMEWORK' as const },
  { name: 'Next.js', slug: 'nextjs', category: 'FRAMEWORK' as const },
  { name: 'NestJS', slug: 'nestjs', category: 'FRAMEWORK' as const },
  { name: 'Vue.js', slug: 'vuejs', category: 'FRAMEWORK' as const },
  { name: 'Tailwind CSS', slug: 'tailwindcss', category: 'FRAMEWORK' as const },
  { name: 'Vite', slug: 'vite', category: 'TOOL' as const },
  { name: 'PostgreSQL', slug: 'postgresql', category: 'DATABASE' as const },
  { name: 'SQLite', slug: 'sqlite', category: 'DATABASE' as const },
  { name: 'Redis', slug: 'redis', category: 'DATABASE' as const },
  { name: 'Prisma', slug: 'prisma', category: 'TOOL' as const },
  { name: 'tRPC', slug: 'trpc', category: 'LIBRARY' as const },
  { name: 'GraphQL', slug: 'graphql', category: 'OTHER' as const },
  { name: 'Radix UI', slug: 'radix-ui', category: 'LIBRARY' as const },
  { name: 'Base UI', slug: 'base-ui', category: 'LIBRARY' as const },
  { name: 'Sass', slug: 'sass', category: 'TOOL' as const },
  { name: 'Zod', slug: 'zod', category: 'LIBRARY' as const },
  { name: 'Playwright', slug: 'playwright', category: 'TOOL' as const },
  { name: 'Storybook', slug: 'storybook', category: 'TOOL' as const },
  { name: 'Docker', slug: 'docker', category: 'DEVOPS' as const },
  { name: 'Turborepo', slug: 'turborepo', category: 'DEVOPS' as const },
];

export interface ProjectCatalogItem {
  repository: {
    githubRepoId: bigint;
    fullName: string;
    ownerLogin: string;
    ownerGithubUserId: bigint;
    ownerType: 'Organization';
    repoName: string;
    htmlUrl: string;
    defaultBranch: string;
  };
  ownerEmail: string;
  title: string;
  slug: string;
  logoSourceUrl: string;
  shortDescription: string;
  fullDescription: string;
  deploymentUrl: string;
  publishedDaysAgo: number;
  techSlugs: string[];
  media: Array<{
    sourceUrl: string;
    caption: string;
  }>;
  collaborators?: Array<{
    email: string;
    role: 'EDITOR' | 'CONTRIBUTOR';
    contributionRoleLabel: string;
    contributionSummary: string;
  }>;
}

const liveScreenshot = (url: string) =>
  `https://image.thum.io/get/width/1600/crop/900/noanimate/${url}`;

export const projectCatalog: ProjectCatalogItem[] = [
  {
    repository: {
      githubRepoId: BigInt(231283452),
      fullName: 'excalidraw/excalidraw',
      ownerLogin: 'excalidraw',
      ownerGithubUserId: BigInt(59452120),
      ownerType: 'Organization',
      repoName: 'excalidraw',
      htmlUrl: 'https://github.com/excalidraw/excalidraw',
      defaultBranch: 'master',
    },
    ownerEmail: 'dev.alex@example.com',
    title: 'Excalidraw Collaborative Whiteboard',
    slug: 'excalidraw-collaborative-whiteboard',
    logoSourceUrl: 'https://avatars.githubusercontent.com/u/59452120?v=4',
    shortDescription:
      'A local-first virtual whiteboard for sketching diagrams, wireframes, and ideas with real-time collaboration.',
    fullDescription:
      'Excalidraw is an open-source, canvas-based whiteboard with a distinctive hand-drawn visual language. The editor supports an infinite canvas, shape libraries, image insertion, dark mode, export to PNG and SVG, and an open JSON file format.\n\nThe hosted application adds offline-ready PWA behavior, local persistence, shareable links, and end-to-end encrypted collaboration. Its reusable React package also makes the editor embeddable in other products, from documentation tools to engineering platforms.',
    deploymentUrl: 'https://excalidraw.com',
    publishedDaysAgo: 2,
    techSlugs: [
      'typescript',
      'react',
      'vite',
      'sass',
      'playwright',
      'javascript',
    ],
    media: [
      {
        sourceUrl: 'https://excalidraw.com/og-image-3.png',
        caption:
          'Excalidraw’s hand-drawn visual language and collaborative canvas.',
      },
      {
        sourceUrl: liveScreenshot('https://excalidraw.com'),
        caption:
          'The live editor with drawing tools, shapes, and an infinite canvas.',
      },
    ],
    collaborators: [
      {
        email: 'dev.sarah@example.com',
        role: 'EDITOR',
        contributionRoleLabel: 'Design systems & accessibility',
        contributionSummary:
          'Refined keyboard navigation, component states, and accessible interaction patterns across the editor.',
      },
    ],
  },
  {
    repository: {
      githubRepoId: BigInt(350360184),
      fullName: 'calcom/cal.diy',
      ownerLogin: 'calcom',
      ownerGithubUserId: BigInt(79145102),
      ownerType: 'Organization',
      repoName: 'cal.diy',
      htmlUrl: 'https://github.com/calcom/cal.diy',
      defaultBranch: 'main',
    },
    ownerEmail: 'dev.sarah@example.com',
    title: 'Cal.diy Scheduling Platform',
    slug: 'cal-diy-scheduling-platform',
    logoSourceUrl: 'https://avatars.githubusercontent.com/u/79145102?v=4',
    shortDescription:
      'Community-driven scheduling infrastructure for booking links, availability, calendars, and self-hosted workflows.',
    fullDescription:
      'Cal.diy is the community-maintained, fully open-source edition of the scheduling platform that began as Cal.com. It gives individuals and self-hosters control over booking pages, availability rules, calendar integrations, and scheduling workflows without relying on a closed hosted service.\n\nThe monorepo combines a modern Next.js interface with type-safe APIs, Prisma, PostgreSQL, authentication, shared packages, and a broad integration surface. It is a substantial example of how a production SaaS can be organized for self-hosting and community contribution.',
    deploymentUrl: 'https://www.cal.diy',
    publishedDaysAgo: 4,
    techSlugs: [
      'typescript',
      'nextjs',
      'react',
      'trpc',
      'prisma',
      'postgresql',
      'tailwindcss',
      'turborepo',
      'zod',
      'docker',
    ],
    media: [
      {
        sourceUrl:
          'https://framerusercontent.com/images/pPSh5HDe1qaySb4R7xBgMHudhU.png',
        caption:
          'The scheduling platform’s booking, availability, and calendar experience.',
      },
    ],
    collaborators: [
      {
        email: 'dev.alex@example.com',
        role: 'CONTRIBUTOR',
        contributionRoleLabel: 'Platform infrastructure',
        contributionSummary:
          'Improved containerized development, PostgreSQL operations, and background scheduling reliability.',
      },
    ],
  },
  {
    repository: {
      githubRepoId: BigInt(585146387),
      fullName: 'shadcn-ui/ui',
      ownerLogin: 'shadcn-ui',
      ownerGithubUserId: BigInt(139895814),
      ownerType: 'Organization',
      repoName: 'ui',
      htmlUrl: 'https://github.com/shadcn-ui/ui',
      defaultBranch: 'main',
    },
    ownerEmail: 'dev.sarah@example.com',
    title: 'shadcn/ui Component Platform',
    slug: 'shadcn-ui-component-platform',
    logoSourceUrl: 'https://avatars.githubusercontent.com/u/139895814?v=4',
    shortDescription:
      'Accessible, beautifully designed components and a code distribution platform for building your own design system.',
    fullDescription:
      'shadcn/ui is an open-code component platform: instead of installing an opaque component package, teams copy accessible component source into their own applications and retain full ownership of it. The project includes a registry, CLI, documentation, examples, themes, and composable application blocks.\n\nIts architecture demonstrates how React primitives, design tokens, Tailwind CSS, and multiple accessibility foundations can support many frameworks without sacrificing customization. The result is both a developer tool and a practical foundation for production design systems.',
    deploymentUrl: 'https://ui.shadcn.com',
    publishedDaysAgo: 6,
    techSlugs: [
      'typescript',
      'react',
      'nextjs',
      'tailwindcss',
      'radix-ui',
      'base-ui',
      'mdx',
      'vite',
      'turborepo',
    ],
    media: [
      {
        sourceUrl:
          'https://ui.shadcn.com/og?title=The%20Foundation%20for%20your%20Design%20System&description=Open%20Source.%20Open%20Code.',
        caption:
          'The shadcn/ui design-system foundation and open-code approach.',
      },
      {
        sourceUrl: liveScreenshot('https://ui.shadcn.com'),
        caption:
          'The live component catalog, documentation, and registry experience.',
      },
    ],
  },
  {
    repository: {
      githubRepoId: BigInt(572984571),
      fullName: 'twentyhq/twenty',
      ownerLogin: 'twentyhq',
      ownerGithubUserId: BigInt(119600397),
      ownerType: 'Organization',
      repoName: 'twenty',
      htmlUrl: 'https://github.com/twentyhq/twenty',
      defaultBranch: 'main',
    },
    ownerEmail: 'dev.alex@example.com',
    title: 'Twenty Open-Source CRM',
    slug: 'twenty-open-source-crm',
    logoSourceUrl: 'https://avatars.githubusercontent.com/u/119600397?v=4',
    shortDescription:
      'A modern, extensible CRM for managing companies, people, opportunities, workflows, and customer data.',
    fullDescription:
      'Twenty is an open-source customer relationship management platform designed as a flexible alternative to traditional enterprise CRMs. Teams can organize people and companies, track opportunities, build views, automate workflows, and adapt the data model to their own sales process.\n\nThe product pairs a polished React workspace with a TypeScript and NestJS backend, GraphQL APIs, PostgreSQL persistence, queues, caching, and a large monorepo. Its metadata-driven approach makes the platform a strong example of extensible product architecture.',
    deploymentUrl: 'https://twenty.com',
    publishedDaysAgo: 8,
    techSlugs: [
      'typescript',
      'react',
      'nestjs',
      'graphql',
      'postgresql',
      'redis',
      'storybook',
      'docker',
    ],
    media: [
      {
        sourceUrl: 'https://twenty.com/images/og/default.png',
        caption:
          'Twenty’s modern workspace for companies, people, and opportunities.',
      },
      {
        sourceUrl: liveScreenshot('https://twenty.com'),
        caption:
          'The live Twenty product site and its open-source CRM positioning.',
      },
    ],
    collaborators: [
      {
        email: 'dev.sarah@example.com',
        role: 'EDITOR',
        contributionRoleLabel: 'Product UI & workflows',
        contributionSummary:
          'Built reusable workspace components and improved opportunity-management workflows.',
      },
    ],
  },
  {
    repository: {
      githubRepoId: BigInt(500289888),
      fullName: 'formbricks/formbricks',
      ownerLogin: 'formbricks',
      ownerGithubUserId: BigInt(105877416),
      ownerType: 'Organization',
      repoName: 'formbricks',
      htmlUrl: 'https://github.com/formbricks/formbricks',
      defaultBranch: 'main',
    },
    ownerEmail: 'dev.sarah@example.com',
    title: 'Formbricks Experience Management',
    slug: 'formbricks-experience-management',
    logoSourceUrl: 'https://avatars.githubusercontent.com/u/105877416?v=4',
    shortDescription:
      'A privacy-first platform for product surveys, website feedback, link surveys, and experience analysis.',
    fullDescription:
      'Formbricks is an open-source experience-management platform for collecting and understanding customer feedback. Product teams can launch targeted in-app surveys, share standalone link surveys, gather website feedback, and connect responses to the context in which they were collected.\n\nThe application is built as a TypeScript monorepo with Next.js, React, Tailwind CSS, Prisma, PostgreSQL, and reusable SDKs. It balances survey authoring, delivery, response analysis, multi-language support, and self-hosting in one cohesive product.',
    deploymentUrl: 'https://formbricks.com',
    publishedDaysAgo: 10,
    techSlugs: [
      'typescript',
      'nextjs',
      'react',
      'tailwindcss',
      'prisma',
      'postgresql',
      'zod',
      'turborepo',
      'docker',
    ],
    media: [
      {
        sourceUrl: liveScreenshot('https://formbricks.com'),
        caption:
          'Formbricks’ privacy-first survey and experience-management platform.',
      },
    ],
    collaborators: [
      {
        email: 'dev.alex@example.com',
        role: 'CONTRIBUTOR',
        contributionRoleLabel: 'Data platform & observability',
        contributionSummary:
          'Improved response-processing reliability and database observability for high-volume surveys.',
      },
    ],
  },
  {
    repository: {
      githubRepoId: BigInt(108761645),
      fullName: 'nocodb/nocodb',
      ownerLogin: 'nocodb',
      ownerGithubUserId: BigInt(50206778),
      ownerType: 'Organization',
      repoName: 'nocodb',
      htmlUrl: 'https://github.com/nocodb/nocodb',
      defaultBranch: 'develop',
    },
    ownerEmail: 'dev.alex@example.com',
    title: 'NocoDB Low-Code Database',
    slug: 'nocodb-low-code-database',
    logoSourceUrl: 'https://avatars.githubusercontent.com/u/50206778?v=4',
    shortDescription:
      'A self-hostable Airtable alternative that turns relational data into collaborative spreadsheet-style workflows.',
    fullDescription:
      'NocoDB is an open-source no-code database platform that presents relational data through an approachable spreadsheet-style interface. Teams can create collaborative views, forms, galleries, automations, and APIs while keeping control of the underlying data.\n\nThe project combines a TypeScript and Vue interface with a Node.js service layer, database connectors, generated REST APIs, role-based collaboration, and self-hosting support. It demonstrates how a low-code product can sit on top of existing PostgreSQL, MySQL, and SQLite data without hiding the database beneath it.',
    deploymentUrl: 'https://nocodb.com',
    publishedDaysAgo: 12,
    techSlugs: [
      'typescript',
      'vuejs',
      'nodejs',
      'nestjs',
      'postgresql',
      'sqlite',
      'javascript',
      'docker',
    ],
    media: [
      {
        sourceUrl:
          'https://cdn.prod.website-files.com/650a7aeba6c28976499496bb/686278d1c40e23ec5f1ac414_66245a0c0a05baffdf947012613f7c7b_Website%20Thumbnail.png',
        caption:
          'NocoDB’s collaborative, spreadsheet-style interface for relational data.',
      },
      {
        sourceUrl: liveScreenshot('https://nocodb.com'),
        caption:
          'The live NocoDB product site and self-hosted no-code platform.',
      },
    ],
  },
];
