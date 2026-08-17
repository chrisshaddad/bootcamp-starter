import { MailService } from './mail.service';

describe('MailService', () => {
  const originalEnvironment = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
      NODE_ENV: 'production',
      BREVO_API_KEY: 'test-brevo-key',
      BREVO_SENDER_EMAIL: 'no-reply@example.com',
      BREVO_SENDER_NAME: 'Test Sender',
    };
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends production email through the Brevo transactional API', async () => {
    const fetchMock = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(new Response(null, { status: 201 }));
    global.fetch = fetchMock;
    const service = new MailService();

    await expect(
      service.sendEmail({
        to: 'user@example.com',
        from: 'ignored@example.com',
        subject: 'Welcome',
        text: 'Hello',
      }),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(request).toBeDefined();
    expect(request!.method).toBe('POST');
    expect(request!.headers).toMatchObject({ 'api-key': 'test-brevo-key' });
    expect(JSON.parse(request!.body as string)).toEqual({
      sender: { email: 'no-reply@example.com', name: 'Test Sender' },
      to: [{ email: 'user@example.com' }],
      subject: 'Welcome',
      textContent: 'Hello',
    });
  });

  it('fails closed when production Brevo configuration is missing', async () => {
    delete process.env.BREVO_API_KEY;
    const service = new MailService();

    await expect(
      service.sendEmail({
        to: 'user@example.com',
        from: 'ignored@example.com',
        subject: 'Welcome',
        text: 'Hello',
      }),
    ).resolves.toBe(false);
  });
});
