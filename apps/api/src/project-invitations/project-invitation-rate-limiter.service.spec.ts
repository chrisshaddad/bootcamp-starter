import { ServiceUnavailableException } from '@nestjs/common';
import { ProjectInvitationRateLimiter } from './project-invitation-rate-limiter.service';

describe('ProjectInvitationRateLimiter', () => {
  const redis = { eval: jest.fn() };
  const service = new ProjectInvitationRateLimiter(redis as never);

  beforeEach(() => {
    jest.clearAllMocks();
    redis.eval.mockResolvedValue(1);
  });

  it('allows bounded collaborator lookups', async () => {
    await expect(
      service.assertLookupAllowed('user-id', 'project-id'),
    ).resolves.toBeUndefined();
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'rate-limit:project-invitations:lookup:user-id:project-id',
      60,
    );
  });

  it('rejects lookups over the per-minute limit', async () => {
    redis.eval.mockResolvedValue(21);
    await expect(
      service.assertLookupAllowed('user-id', 'project-id'),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('rejects invitation creation over the tighter limit', async () => {
    redis.eval.mockResolvedValue(11);
    await expect(
      service.assertCreateAllowed('user-id', 'project-id'),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('fails closed with a safe message when Redis is unavailable', async () => {
    redis.eval.mockRejectedValue(new Error('connection details'));
    await expect(
      service.assertLookupAllowed('user-id', 'project-id'),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
