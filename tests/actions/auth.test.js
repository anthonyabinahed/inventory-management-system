import { vi, describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  createTestUser,
  getAnonClient,
  cleanupAll,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from '../helpers/supabase.js';
import { createClient } from '@supabase/supabase-js';

// ============ Mocks (only Next.js framework + external services) ============

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return { ...actual, cache: (fn) => fn };
});

vi.mock('@/libs/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({}),
}));

// Mock createSupabaseClient to return a real Supabase client
let currentClient;

vi.mock('@/libs/supabase/server', () => ({
  createSupabaseClient: vi.fn(async () => currentClient),
}));

const { login, signOut, updatePassword, requestPasswordReset, setSessionFromTokens, verifyInviteToken } = await import('@/actions/auth');
const { sendEmail } = await import('@/libs/resend');

let regularClient;

beforeAll(async () => {
  await cleanupAll();

  await createTestUser({
    email: 'auth-action-admin@test.com',
    password: 'AdminPass123!',
    role: 'admin',
    fullName: 'Auth Admin',
  });

  ({ client: regularClient } = await createTestUser({
    email: 'auth-action-user@test.com',
    password: 'UserPass123!',
    role: 'user',
    fullName: 'Auth User',
  }));

  await createTestUser({
    email: 'auth-extra-user@test.com',
    password: 'UserPass123!',
    role: 'user',
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await cleanupAll();
});

// ============ login ============

describe('login', () => {
  function makeFormData(email, password) {
    const fd = new FormData();
    fd.append('email', email);
    fd.append('password', password);
    return fd;
  }

  it('returns validation error for invalid email without calling Supabase', async () => {
    currentClient = getAnonClient();
    const result = await login(makeFormData('bad-email', 'password123'));
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('returns validation error for empty password', async () => {
    currentClient = getAnonClient();
    const result = await login(makeFormData('user@example.com', ''));
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('returns isAdmin: false for regular user', async () => {
    // Use a fresh anon client — login() signs in within the action
    currentClient = getAnonClient();
    const result = await login(makeFormData('auth-action-user@test.com', 'UserPass123!'));
    expect(result.success).toBe(true);
    expect(result.isAdmin).toBe(false);
  });

  it('returns isAdmin: true for admin user', async () => {
    currentClient = getAnonClient();
    const result = await login(makeFormData('auth-action-admin@test.com', 'AdminPass123!'));
    expect(result.success).toBe(true);
    expect(result.isAdmin).toBe(true);
  });

  it('returns error for wrong password', async () => {
    currentClient = getAnonClient();
    const result = await login(makeFormData('auth-action-user@test.com', 'WrongPass123!'));
    expect(result.errorMessage).toBeDefined();
    expect(result.success).toBeUndefined();
  });
});

// ============ signOut ============

describe('signOut', () => {
  it('signs out authenticated user', async () => {
    currentClient = regularClient;
    const result = await signOut();
    expect(result.success).toBe(true);
  });

  it('returns unauthorized for unauthenticated user', async () => {
    currentClient = getAnonClient();
    const result = await signOut();
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });
});

// ============ updatePassword ============

describe('updatePassword', () => {
  it('rejects password shorter than 8 chars', async () => {
    const result = await updatePassword('short');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('8 characters');
  });

  it('returns unauthorized for unauthenticated user', async () => {
    currentClient = getAnonClient();
    const result = await updatePassword('ValidPass123');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });

  it('updates password for authenticated user', async () => {
    // Create a throwaway user for password update test
    const { client: throwawayClient } = await createTestUser({
      email: 'password-change@test.com',
      password: 'OldPass123!',
      role: 'user',
    });
    currentClient = throwawayClient;

    const result = await updatePassword('NewPass456!');
    expect(result.success).toBe(true);
  });
});

// ============ requestPasswordReset ============

describe('requestPasswordReset', () => {
  it('returns validation error for invalid email format', async () => {
    const result = await requestPasswordReset('bad-email');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('calls generateLink and sendEmail on valid email', async () => {
    const result = await requestPasswordReset('auth-action-user@test.com');
    expect(result.success).toBe(true);
    expect(sendEmail).toHaveBeenCalled();
  });

  it('returns success even when user does not exist (security)', async () => {
    const result = await requestPasswordReset('nonexistent@example.com');
    // Should still return success to not reveal user existence
    expect(result.success).toBe(true);
  });

  it('returns success even when sendEmail throws (security)', async () => {
    sendEmail.mockRejectedValueOnce(new Error('Email service down'));
    const result = await requestPasswordReset('auth-action-user@test.com');
    expect(result.success).toBe(true);
  });
});

// ============ setSessionFromTokens ============

describe('setSessionFromTokens', () => {
  it('returns user for valid session tokens', async () => {
    // Get real tokens by signing in
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signIn } = await tempClient.auth.signInWithPassword({
      email: 'auth-extra-user@test.com',
      password: 'UserPass123!',
    });

    // Use a fresh anon client for the action
    currentClient = getAnonClient();
    const result = await setSessionFromTokens(
      signIn.session.access_token,
      signIn.session.refresh_token
    );

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('auth-extra-user@test.com');
    expect(result.errorMessage).toBeNull();
  });

  it('returns error for invalid tokens', async () => {
    currentClient = getAnonClient();
    const result = await setSessionFromTokens('invalid-access-token', 'invalid-refresh-token');
    expect(result.user).toBeNull();
    expect(result.errorMessage).toBeDefined();
  });

  it('returns error for empty tokens', async () => {
    currentClient = getAnonClient();
    const result = await setSessionFromTokens('', '');
    expect(result.user).toBeNull();
    expect(result.errorMessage).toBeDefined();
  });
});

// ============ verifyInviteToken ============

describe('verifyInviteToken', () => {
  it('returns error for invalid token hash', async () => {
    currentClient = getAnonClient();
    const result = await verifyInviteToken('invalid-token-hash');
    expect(result.user).toBeNull();
    expect(result.errorMessage).toBeDefined();
  });

  it('returns error for empty token hash', async () => {
    currentClient = getAnonClient();
    const result = await verifyInviteToken('');
    expect(result.user).toBeNull();
    expect(result.errorMessage).toBeDefined();
  });
});
