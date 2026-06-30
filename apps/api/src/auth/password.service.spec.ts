import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('hashes a password to an argon2id string', async () => {
    const hash = await service.hash('Sup3rSecret');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('Sup3rSecret');
  });

  it('produces different hashes for the same password (random salt)', async () => {
    const a = await service.hash('Sup3rSecret');
    const b = await service.hash('Sup3rSecret');
    expect(a).not.toEqual(b);
  });

  it('verifies a correct password', async () => {
    const hash = await service.hash('Sup3rSecret');
    await expect(service.verify(hash, 'Sup3rSecret')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('Sup3rSecret');
    await expect(service.verify(hash, 'wrong')).resolves.toBe(false);
  });

  it('returns false (never throws) for a malformed hash', async () => {
    await expect(service.verify('not-a-hash', 'whatever')).resolves.toBe(false);
  });

  it('verifyAgainstDummy always resolves to false', async () => {
    await expect(service.verifyAgainstDummy('anything')).resolves.toBe(false);
  });
});
