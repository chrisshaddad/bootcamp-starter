import { normalizeMediaUrl } from './normalize-media-url';

describe('normalizeMediaUrl', () => {
  const originalApiUrl = process.env.API_URL;

  beforeAll(() => {
    process.env.API_URL = 'http://localhost:3001';
  });

  afterAll(() => {
    if (originalApiUrl === undefined) delete process.env.API_URL;
    else process.env.API_URL = originalApiUrl;
  });

  it('normalizes relative media paths against the API origin', () => {
    expect(normalizeMediaUrl('/uploads/profile.png')).toBe(
      'http://localhost:3001/uploads/profile.png',
    );
  });

  it.each([
    'javascript:alert(1)',
    'data:image/png;base64,abc',
    'file:///tmp/a',
  ])('rejects the unsafe URL %s', (url) => {
    expect(normalizeMediaUrl(url)).toBeNull();
  });
});
