import { NotFoundException } from '@nestjs/common';
import { ProjectRoleKey } from '@repo/db';
import type { DatabaseService } from '../database/prisma.service';
import { UsersService } from './users.service';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const PROJECT_ID = '00000000-0000-4000-8000-000000000002';
const COLLABORATION_ID = '00000000-0000-4000-8000-000000000003';
const TECHNOLOGY_ID = '00000000-0000-4000-8000-000000000004';

describe('UsersService public developer portfolio', () => {
  const db = {
    user: { findFirst: jest.fn() },
    project: { findMany: jest.fn() },
  };
  const service = new UsersService(db as unknown as DatabaseService);

  beforeEach(() => {
    jest.clearAllMocks();
    db.user.findFirst.mockResolvedValue({
      id: USER_ID,
      developerProfile: {
        publicSlug: 'sarah-chen',
        displayName: 'Sarah Chen',
        headline: 'Full-stack developer',
        bio: 'I build useful products.',
        location: 'Beirut, Lebanon',
        profilePictureUrl: '',
        githubUsername: 'sarahchen',
        linkedinUrl: 'https://linkedin.com/in/sarahchen',
        personalWebsiteUrl: null,
      },
    });
    db.project.findMany.mockResolvedValue([
      project({ id: PROJECT_ID, createdByUserId: USER_ID, members: [] }),
      project({
        id: COLLABORATION_ID,
        createdByUserId: '00000000-0000-4000-8000-000000000099',
        members: [
          {
            role: ProjectRoleKey.CONTRIBUTOR,
            contributionRoleLabel: 'API developer',
          },
        ],
      }),
    ]);
  });

  it('returns owned and verified collaboration work with safe portfolio fields', async () => {
    await expect(
      service.getDeveloperPublicProfile('sarah-chen'),
    ).resolves.toMatchObject({
      userId: USER_ID,
      publicSlug: 'sarah-chen',
      githubUrl: 'https://github.com/sarahchen',
      profilePictureUrl: null,
      stats: {
        publishedProjects: 2,
        ownedProjects: 1,
        collaborationProjects: 1,
      },
      projects: [
        expect.objectContaining({ id: PROJECT_ID, role: 'OWNER' }),
        expect.objectContaining({
          id: COLLABORATION_ID,
          role: 'CONTRIBUTOR',
          contributionRoleLabel: 'API developer',
        }),
      ],
    });

    const userQuery = JSON.stringify(db.user.findFirst.mock.calls);
    expect(userQuery).toContain('"accountType":"DEVELOPER"');
    expect(userQuery).toContain('"isConfirmed":true');

    const projectQuery = JSON.stringify(db.project.findMany.mock.calls);
    expect(projectQuery).toContain('"status":"PUBLISHED"');
    expect(projectQuery).toContain('"verificationStatus":"VERIFIED"');
  });

  it('does not expose missing or unconfirmed developer profiles', async () => {
    db.user.findFirst.mockResolvedValue(null);

    await expect(
      service.getDeveloperPublicProfile('missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.project.findMany).not.toHaveBeenCalled();
  });
});

function project({
  id,
  createdByUserId,
  members,
}: {
  id: string;
  createdByUserId: string;
  members: Array<{
    role: ProjectRoleKey;
    contributionRoleLabel: string | null;
  }>;
}) {
  const updatedAt = new Date('2026-07-18T00:00:00.000Z');
  return {
    id,
    createdByUserId,
    title: id === PROJECT_ID ? 'Owned project' : 'Collaboration project',
    slug: id === PROJECT_ID ? 'owned-project' : 'collaboration-project',
    logoUrl: null,
    shortDescription: 'A published project',
    deploymentUrl: null,
    publishedAt: updatedAt,
    updatedAt,
    members,
    media: [
      {
        publicUrl:
          'http://localhost:9000/bootcamp-media/project-media/project/cover.png',
      },
    ],
    technologies: [
      {
        technology: {
          id: TECHNOLOGY_ID,
          name: 'TypeScript',
          slug: 'typescript',
          category: 'LANGUAGE',
        },
      },
    ],
  };
}
