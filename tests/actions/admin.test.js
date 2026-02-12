import { vi, describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  createTestUser,
  getAnonClient,
  getAdminClient,
  cleanupAll,
} from '../helpers/supabase.js';

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

const { verifyAdmin, inviteUser, updateUserRole, revokeUser } = await import('@/actions/admin');
const { sendEmail } = await import('@/libs/resend');

let adminClient;
let regularUser, regularClient;

beforeAll(async () => {
  await cleanupAll();

  ({ client: adminClient } = await createTestUser({
    email: 'admin-action-admin@test.com',
    password: 'AdminPass123!',
    role: 'admin',
    fullName: 'Admin Tester',
  }));

  ({ user: regularUser, client: regularClient } = await createTestUser({
    email: 'admin-action-user@test.com',
    password: 'UserPass123!',
    role: 'user',
    fullName: 'Regular Tester',
  }));
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await cleanupAll();
});

// ============ verifyAdmin ============

describe('verifyAdmin', () => {
  it('returns unauthorized when no user', async () => {
    currentClient = getAnonClient();
    const result = await verifyAdmin();
    expect(result.isAdmin).toBe(false);
    expect(result.user).toBeNull();
    expect(result.error).toBe('Unauthorized');
  });

  it('returns forbidden for user with role "user"', async () => {
    currentClient = regularClient;
    const result = await verifyAdmin();
    expect(result.isAdmin).toBe(false);
    expect(result.error).toBe('Forbidden: Admin access required');
  });

  it('returns isAdmin true for user with role "admin"', async () => {
    currentClient = adminClient;
    const result = await verifyAdmin();
    expect(result.isAdmin).toBe(true);
    expect(result.error).toBeNull();
  });
});

// ============ inviteUser ============

describe('inviteUser', () => {
  it('returns validation error for invalid email', async () => {
    const result = await inviteUser('not-an-email', 'Jane Doe', 'user');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('returns validation error for missing fullName', async () => {
    const result = await inviteUser('jane@example.com', '', 'user');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('blocks non-admin caller', async () => {
    currentClient = regularClient;
    const result = await inviteUser('new@example.com', 'Jane Doe', 'user');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Forbidden: Admin access required');
  });

  it('blocks unauthenticated caller', async () => {
    currentClient = getAnonClient();
    const result = await inviteUser('new@example.com', 'Jane Doe', 'user');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });

  it('invites user when caller is admin', async () => {
    currentClient = adminClient;
    const result = await inviteUser('invited-real@example.com', 'Jane Doe', 'user');
    expect(result.success).toBe(true);
    expect(result.userId).toBeDefined();
    expect(sendEmail).toHaveBeenCalled();
  });

  it('returns error for already registered email', async () => {
    currentClient = adminClient;
    const result = await inviteUser('admin-action-user@test.com', 'Existing User', 'user');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('already exists');
  });
});

// ============ updateUserRole ============

describe('updateUserRole', () => {
  it('returns validation error for invalid UUID', async () => {
    const result = await updateUserRole('not-a-uuid', 'admin');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('returns validation error for invalid role', async () => {
    const result = await updateUserRole('550e8400-e29b-41d4-a716-446655440000', 'superadmin');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('blocks non-admin caller', async () => {
    currentClient = regularClient;
    const result = await updateUserRole(regularUser.id, 'admin');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Forbidden: Admin access required');
  });

  it('blocks unauthenticated caller', async () => {
    currentClient = getAnonClient();
    const result = await updateUserRole(regularUser.id, 'admin');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });

  it('updates role when caller is admin and verifies in DB', async () => {
    currentClient = adminClient;
    const result = await updateUserRole(regularUser.id, 'admin');
    expect(result.success).toBe(true);

    // Verify role actually changed in DB
    const admin = getAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', regularUser.id)
      .single();
    expect(profile.role).toBe('admin');

    // Restore role back to user for other tests
    await admin.from('profiles').update({ role: 'user' }).eq('id', regularUser.id);
  });
});

// ============ revokeUser ============

describe('revokeUser', () => {
  it('blocks non-admin caller', async () => {
    currentClient = regularClient;
    const result = await revokeUser('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Forbidden: Admin access required');
  });

  it('blocks unauthenticated caller', async () => {
    currentClient = getAnonClient();
    const result = await revokeUser('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });

  it('revokes user when caller is admin and verifies deletion', async () => {
    // Create a throwaway user to revoke
    const { user: throwaway } = await createTestUser({
      email: 'revoke-target@test.com',
      role: 'user',
    });

    currentClient = adminClient;
    const result = await revokeUser(throwaway.id);
    expect(result.success).toBe(true);

    // Verify user+profile actually deleted
    const admin = getAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('id', throwaway.id)
      .maybeSingle();
    expect(profile).toBeNull();
  });
});
