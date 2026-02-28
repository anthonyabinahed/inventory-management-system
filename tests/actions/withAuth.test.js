import { vi, describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  createTestUser,
  getAnonClient,
  getAdminClient,
  cleanupAll,
} from '../helpers/supabase.js';

// ============ Mocks ============

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

let activeUser, activeClient;

beforeAll(async () => {
  await cleanupAll();

  ({ user: activeUser, client: activeClient } = await createTestUser({
    email: 'withauth-active@test.com',
    password: 'TestPass123!',
    role: 'user',
    fullName: 'Active User',
  }));
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await cleanupAll();
});

describe('withAuth', () => {
  it('returns unauthorized when no user session', async () => {
    currentClient = getAnonClient();
    const dummyAction = vi.fn();

    const result = await withAuth(dummyAction);

    expect(result).toEqual({ success: false, errorMessage: 'Unauthorized' });
    expect(dummyAction).not.toHaveBeenCalled();
  });

  it('allows active user to proceed', async () => {
    currentClient = activeClient;
    const dummyAction = vi.fn().mockResolvedValue({ success: true, data: 'test' });

    const result = await withAuth(dummyAction);

    expect(result).toEqual({ success: true, data: 'test' });
    expect(dummyAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: activeUser.id }),
      expect.anything()
    );
  });

  it('blocks deactivated user', async () => {
    // Create a user and deactivate them
    const { user: deactivatedUser, client: deactivatedClient } = await createTestUser({
      email: 'withauth-deactivated@test.com',
      password: 'TestPass123!',
      role: 'user',
      fullName: 'Deactivated User',
    });

    const admin = getAdminClient();
    await admin.from('profiles').update({ is_active: false }).eq('id', deactivatedUser.id);

    currentClient = deactivatedClient;
    const dummyAction = vi.fn();

    const result = await withAuth(dummyAction);

    expect(result).toEqual({ success: false, errorMessage: 'Account deactivated' });
    expect(dummyAction).not.toHaveBeenCalled();
  });
});
