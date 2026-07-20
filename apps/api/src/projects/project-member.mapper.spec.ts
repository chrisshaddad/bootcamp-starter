import {
  ProjectRoleKey,
  VerificationSource,
  VerificationStatus,
} from '@repo/db';
import { mapProjectMember } from './project-member.mapper';

const MEMBER_ID = '00000000-0000-4000-8000-000000000001';
const PROJECT_ID = '00000000-0000-4000-8000-000000000002';
const USER_ID = '00000000-0000-4000-8000-000000000003';

describe('mapProjectMember', () => {
  it('normalizes a blank profile-picture value to null', () => {
    const timestamp = new Date('2026-07-18T00:00:00.000Z');
    const member = {
      id: MEMBER_ID,
      projectId: PROJECT_ID,
      userId: USER_ID,
      githubUserId: 123n,
      githubUsername: 'developer',
      role: ProjectRoleKey.OWNER,
      contributionRoleLabel: null,
      contributionSummary: null,
      githubPermission: 'admin',
      githubRoleName: null,
      verificationStatus: VerificationStatus.VERIFIED,
      verificationSource: VerificationSource.GITHUB_OWNER,
      verifiedAt: timestamp,
      addedByUserId: USER_ID,
      createdAt: timestamp,
      updatedAt: timestamp,
      user: {
        id: USER_ID,
        developerProfile: {
          displayName: 'Developer',
          publicSlug: 'developer',
          profilePictureUrl: '   ',
        },
      },
    } as Parameters<typeof mapProjectMember>[0];

    expect(mapProjectMember(member).user?.profilePictureUrl).toBeNull();
  });
});
