import { analyzeRepositorySnapshot } from './repository-analyzer';
import type { DetectedTechnology } from './repository-scanner.types';

describe('analyzeRepositorySnapshot', () => {
  it('detects technologies from package.json dependencies and scripts', () => {
    const detections = analyzeRepositorySnapshot({
      files: [
        {
          path: 'package.json',
          content: JSON.stringify({
            dependencies: {
              react: '^19.0.0',
              '@nestjs/core': '^11.0.0',
              express: '^5.0.0',
              next: '^16.0.0',
              '@prisma/client': '^7.0.0',
              mongoose: '^9.0.0',
              pg: '^8.0.0',
              mysql2: '^3.0.0',
              ioredis: '^5.0.0',
            },
            devDependencies: {
              '@angular/core': '^21.0.0',
              tailwindcss: '^4.0.0',
              vite: '^8.0.0',
            },
            peerDependencies: {
              redis: '^5.0.0',
            },
            scripts: {
              dev: 'vite --host 0.0.0.0',
            },
          }),
        },
      ],
    });

    expect(getSlugs(detections)).toEqual([
      'angular',
      'express',
      'mongodb',
      'mysql',
      'nestjs',
      'nextjs',
      'postgresql',
      'prisma',
      'react',
      'redis',
      'tailwindcss',
      'vite',
    ]);
    expect(getDetection(detections, 'react')).toMatchObject({
      name: 'React',
      slug: 'react',
      category: 'FRAMEWORK',
      evidence: ['Detected dependency "react" in package.json'],
      sourceFiles: ['package.json'],
      signals: ['package-json'],
    });
  });

  it('detects Next.js from framework script commands', () => {
    const detections = analyzeRepositorySnapshot({
      files: [
        {
          path: 'package.json',
          content: JSON.stringify({
            scripts: {
              dev: 'next dev',
              build: 'next build',
            },
          }),
        },
      ],
    });

    expect(getDetection(detections, 'nextjs')).toMatchObject({
      name: 'Next.js',
      category: 'FRAMEWORK',
      signals: ['package-json'],
    });
  });

  it('does not detect Next.js from an npm release tag', () => {
    const detections = analyzeRepositorySnapshot({
      files: [
        {
          path: 'package.json',
          content: JSON.stringify({
            dependencies: {
              '@nestjs/core': '^11.0.0',
            },
            scripts: {
              release: 'release-it --npm-tag=next',
            },
          }),
        },
      ],
    });

    expect(getSlugs(detections)).toEqual(['nestjs']);
  });

  it('detects Docker from a Dockerfile', () => {
    const detections = analyzeRepositorySnapshot({
      files: [{ path: 'Dockerfile', content: 'FROM node:24-alpine' }],
    });

    expect(getDetection(detections, 'docker')).toMatchObject({
      name: 'Docker',
      category: 'DEVOPS',
      evidence: ['Detected Dockerfile'],
      sourceFiles: ['Dockerfile'],
      signals: ['dockerfile'],
    });
  });

  it('detects Docker Compose and database images from compose files', () => {
    const detections = analyzeRepositorySnapshot({
      files: [
        {
          path: 'docker-compose.yml',
          content: `
            services:
              postgres:
                image: postgres:18
              mongo:
                image: mongo:7
              mysql:
                image: mysql:8
              redis:
                image: redis:8
          `,
        },
      ],
    });

    expect(getSlugs(detections)).toEqual([
      'docker-compose',
      'mongodb',
      'mysql',
      'postgresql',
      'redis',
    ]);
    expect(getDetection(detections, 'docker-compose').evidence).toContain(
      'Detected Docker Compose file',
    );
  });

  it('detects Prisma and datasource providers from Prisma schema content', () => {
    const detections = analyzeRepositorySnapshot({
      files: [
        {
          path: 'prisma/schema.prisma',
          content: `
            datasource db {
              provider = "postgresql"
              url      = env("DATABASE_URL")
            }

            datasource local {
              provider = "sqlite"
              url      = "file:dev.db"
            }
          `,
        },
      ],
    });

    expect(getSlugs(detections)).toEqual(['postgresql', 'prisma', 'sqlite']);
    expect(getDetection(detections, 'postgresql').evidence).toContain(
      'Detected Prisma datasource provider "postgresql"',
    );
  });

  it('detects GitHub Actions workflow files', () => {
    const detections = analyzeRepositorySnapshot({
      files: [
        {
          path: '.github/workflows/ci.yaml',
          content: 'name: CI',
        },
      ],
    });

    expect(getDetection(detections, 'github-actions')).toMatchObject({
      name: 'GitHub Actions',
      category: 'DEVOPS',
      evidence: ['Detected GitHub Actions workflow'],
      sourceFiles: ['.github/workflows/ci.yaml'],
      signals: ['github-actions'],
    });
  });

  it('maps GitHub language byte counts to language labels', () => {
    const detections = analyzeRepositorySnapshot({
      languages: [
        { name: 'TypeScript', bytes: 123456 },
        { name: 'C#', bytes: 1234 },
        { name: 'JavaScript', bytes: 0 },
      ],
    });

    expect(getSlugs(detections)).toEqual(['csharp', 'typescript']);
    expect(getDetection(detections, 'typescript')).toMatchObject({
      name: 'TypeScript',
      slug: 'typescript',
      category: 'LANGUAGE',
      evidence: ['Detected GitHub language "TypeScript" (123456 bytes)'],
      sourceFiles: [],
      signals: ['github-language'],
    });
  });

  it('suppresses duplicate labels while preserving distinct evidence', () => {
    const detections = analyzeRepositorySnapshot({
      files: [
        {
          path: 'package.json',
          content: JSON.stringify({
            dependencies: {
              pg: '^8.0.0',
            },
          }),
        },
        {
          path: 'compose.yml',
          content: 'services:\n  db:\n    image: postgres:18',
        },
        {
          path: 'prisma/schema.prisma',
          content: 'datasource db { provider = "postgresql" }',
        },
      ],
    });

    const postgresql = getDetection(detections, 'postgresql');
    expect(
      detections.filter((technology) => technology.slug === 'postgresql'),
    ).toHaveLength(1);
    expect(postgresql.evidence).toEqual([
      'Detected dependency "pg" in package.json',
      'Detected PostgreSQL image in Docker Compose file',
      'Detected Prisma datasource provider "postgresql"',
    ]);
    expect(postgresql.signals).toEqual([
      'package-json',
      'docker-compose',
      'prisma-schema',
    ]);
  });

  it('continues scanning when package.json is invalid', () => {
    const detections = analyzeRepositorySnapshot({
      files: [
        {
          path: 'package.json',
          content: '{ invalid json',
        },
        {
          path: 'Dockerfile',
          content: 'FROM node:24-alpine',
        },
      ],
    });

    expect(getSlugs(detections)).toEqual(['docker']);
  });

  it('returns an empty result for empty or unsupported snapshots', () => {
    expect(analyzeRepositorySnapshot({})).toEqual([]);
    expect(
      analyzeRepositorySnapshot({
        files: [{ path: 'README.md', content: '# Hello' }],
      }),
    ).toEqual([]);
  });
});

function getDetection(
  detections: DetectedTechnology[],
  slug: string,
): DetectedTechnology {
  const detection = detections.find((technology) => technology.slug === slug);

  if (!detection) {
    throw new Error(`Expected detection for ${slug}`);
  }

  return detection;
}

function getSlugs(detections: DetectedTechnology[]): string[] {
  return detections.map((technology) => technology.slug).sort();
}
