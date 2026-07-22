import { mapProjectInvitation } from './project-invitation.mapper';

describe('mapProjectInvitation', () => {
  it('returns only the shared public response contract', () => {
    const response = mapProjectInvitation({
      id: '00000000-0000-4000-8000-000000000001',
      projectId: '00000000-0000-4000-8000-000000000002',
      invitedByUserId: '00000000-0000-4000-8000-000000000003',
      inviteeUserId: '00000000-0000-4000-8000-000000000004',
      inviteeGithubUserId: 123n,
      inviteeGithubUsername: 'collaborator',
      requestedRole: 'CONTRIBUTOR',
      contributionRoleLabel: null,
      githubPermission: 'push',
      githubRoleName: 'write',
      status: 'PENDING',
      pendingKey: 'internal-concurrency-key',
      expiresAt: new Date('2026-07-24T10:00:00.000Z'),
      respondedAt: null,
      canceledAt: null,
      createdAt: new Date('2026-07-17T10:00:00.000Z'),
      updatedAt: new Date('2026-07-17T10:00:00.000Z'),
      project: {
        id: '00000000-0000-4000-8000-000000000002',
        title: 'Project',
        slug: 'project',
        repository: { fullName: 'owner/project' },
      },
      invitedBy: {
        id: '00000000-0000-4000-8000-000000000003',
        developerProfile: {
          displayName: 'Owner',
          publicSlug: 'owner',
          profilePictureUrl: '/uploads/profile-pictures/owner.png',
        },
      },
      invitee: {
        id: '00000000-0000-4000-8000-000000000004',
        developerProfile: {
          displayName: 'Collaborator',
          publicSlug: 'collaborator',
          profilePictureUrl: null,
        },
      },
    } as never);

    expect(response).not.toHaveProperty('projectId');
    expect(response).not.toHaveProperty('invitedByUserId');
    expect(response).not.toHaveProperty('inviteeGithubUserId');
    expect(response).not.toHaveProperty('pendingKey');
    expect(response).toMatchObject({
      inviteeGithubUsername: 'collaborator',
      project: { repositoryFullName: 'owner/project' },
      inviter: {
        profilePictureUrl:
          'http://localhost:3001/uploads/profile-pictures/owner.png',
      },
    });
  });
});
