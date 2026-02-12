import { vi, describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  createTestUser,
  getAnonClient,
  cleanupAll,
} from '../helpers/supabase.js';

let authenticatedClient;
let authenticatedUser;

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

let currentClient;

vi.mock('@/libs/supabase/server', () => ({
  createSupabaseClient: vi.fn(async () => currentClient),
}));

const { withAuth } = await import('@/libs/auth');

beforeAll(async () => {
  await cleanupAll();

  ({ user: authenticatedUser, client: authenticatedClient } = await createTestUser({
    email: 'withauth-test@test.com',
    role: 'user',
    fullName: 'WithAuth Test',
  }));
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await cleanupAll();
});

describe('withAuth', () => {
  it('returns unauthorized when no user is authenticated', async () => {
    // Anon client — getUser() returns null
    currentClient = getAnonClient();

    const actionFn = vi.fn();
    const result = await withAuth(actionFn);

    expect(result).toEqual({ success: false, errorMessage: 'Unauthorized' });
    expect(actionFn).not.toHaveBeenCalled();
  });

  it('calls action with real user and supabase when authenticated', async () => {
    currentClient = authenticatedClient;

    const actionFn = vi.fn().mockResolvedValue({ success: true, data: 'test-data' });
    const result = await withAuth(actionFn);

    expect(actionFn).toHaveBeenCalledWith(
      expect.objectContaining({ id: authenticatedUser.id, email: 'withauth-test@test.com' }),
      currentClient
    );
    expect(result).toEqual({ success: true, data: 'test-data' });
  });

  it('propagates errors thrown by the action function', async () => {
    currentClient = authenticatedClient;

    const actionFn = vi.fn().mockRejectedValue(new Error('Action failed'));

    await expect(withAuth(actionFn)).rejects.toThrow('Action failed');
  });
});
