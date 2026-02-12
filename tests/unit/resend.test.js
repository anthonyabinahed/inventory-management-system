import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Resend client
const mockSend = vi.fn();
vi.mock('resend', () => ({
  Resend: vi.fn(function () {
    this.emails = { send: mockSend };
  }),
}));

vi.mock('@/config', () => ({
  default: {
    resend: { fromNoReply: 'Test App <noreply@test.com>' },
  },
}));

// Save and restore RESEND_API_KEY between tests
const originalKey = process.env.RESEND_API_KEY;

beforeEach(() => {
  vi.clearAllMocks();
  // Reset the module so the singleton `resend` variable is cleared
  vi.resetModules();
  process.env.RESEND_API_KEY = 'test-api-key';
});

afterEach(() => {
  if (originalKey !== undefined) {
    process.env.RESEND_API_KEY = originalKey;
  } else {
    delete process.env.RESEND_API_KEY;
  }
});

describe('sendEmail', () => {
  it('sends email with correct params using config default from', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });
    const { sendEmail } = await import('@/libs/resend');

    const result = await sendEmail({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'Plain text',
      html: '<p>HTML</p>',
    });

    expect(mockSend).toHaveBeenCalledWith({
      from: 'Test App <noreply@test.com>',
      to: 'user@example.com',
      subject: 'Hello',
      text: 'Plain text',
      html: '<p>HTML</p>',
    });
    expect(result).toEqual({ id: 'email-123' });
  });

  it('uses custom from when provided', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-456' }, error: null });
    const { sendEmail } = await import('@/libs/resend');

    await sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      text: 'text',
      html: '<p>html</p>',
      from: 'Custom <custom@test.com>',
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'Custom <custom@test.com>' })
    );
  });

  it('includes replyTo when provided', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-789' }, error: null });
    const { sendEmail } = await import('@/libs/resend');

    await sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      text: 'text',
      html: '<p>html</p>',
      replyTo: 'reply@example.com',
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'reply@example.com' })
    );
  });

  it('omits replyTo when not provided', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-000' }, error: null });
    const { sendEmail } = await import('@/libs/resend');

    await sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      text: 'text',
      html: '<p>html</p>',
    });

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty('replyTo');
  });

  it('throws when Resend returns an error', async () => {
    const resendError = { message: 'Rate limit exceeded' };
    mockSend.mockResolvedValue({ data: null, error: resendError });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { sendEmail } = await import('@/libs/resend');

    await expect(
      sendEmail({ to: 'user@example.com', subject: 'Test', text: 'text', html: '<p>html</p>' })
    ).rejects.toEqual(resendError);
  });

  it('throws when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    const { sendEmail } = await import('@/libs/resend');

    await expect(
      sendEmail({ to: 'user@example.com', subject: 'Test', text: 'text', html: '<p>html</p>' })
    ).rejects.toThrow('RESEND_API_KEY is not set');
  });
});
