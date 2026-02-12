import { vi, describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  createTestUser,
  getAnonClient,
  cleanupAll,
} from '../helpers/supabase.js';

// ============ Mocks (only Next.js framework) ============

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

const { getAllUsers, getUserProfile } = await import('@/actions/users');

let userClient, user;

beforeAll(async () => {
  await cleanupAll();

  ({ user, client: userClient } = await createTestUser({
    email: 'users-action-user@test.com',
    password: 'UserPass123!',
    role: 'user',
    fullName: 'Users Action User',
  }));

  await createTestUser({
    email: 'users-action-admin@test.com',
    password: 'AdminPass123!',
    role: 'admin',
    fullName: 'Users Action Admin',
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  currentClient = userClient;
});

afterAll(async () => {
  await cleanupAll();
});

// ============ getAllUsers ============

describe('getAllUsers', () => {
  it('returns all profiles for authenticated user', async () => {
    const result = await getAllUsers();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThanOrEqual(2);
  });

  it('returns profiles ordered by created_at descending', async () => {
    const result = await getAllUsers();
    expect(result.success).toBe(true);
    for (let i = 1; i < result.data.length; i++) {
      expect(new Date(result.data[i - 1].created_at) >= new Date(result.data[i].created_at)).toBe(true);
    }
  });

  it('returns unauthorized for anon client', async () => {
    currentClient = getAnonClient();
    const result = await getAllUsers();
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });

  it('data includes expected fields', async () => {
    const result = await getAllUsers();
    expect(result.success).toBe(true);
    const profile = result.data[0];
    expect(profile).toHaveProperty('email');
    expect(profile).toHaveProperty('full_name');
    expect(profile).toHaveProperty('role');
    expect(profile).toHaveProperty('id');
  });
});

// ============ getUserProfile ============

describe('getUserProfile', () => {
  it('returns profile for valid user ID', async () => {
    const result = await getUserProfile(user.id);
    expect(result.success).toBe(true);
    expect(result.data.email).toBe('users-action-user@test.com');
    expect(result.data.full_name).toBe('Users Action User');
    expect(result.data.role).toBe('user');
  });

  it('returns error for non-existent UUID', async () => {
    const result = await getUserProfile('00000000-0000-0000-0000-000000000000');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('returns unauthorized for anon client', async () => {
    currentClient = getAnonClient();
    const result = await getUserProfile(user.id);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });

  it('returned profile has expected shape', async () => {
    const result = await getUserProfile(user.id);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('id');
    expect(result.data).toHaveProperty('email');
    expect(result.data).toHaveProperty('full_name');
    expect(result.data).toHaveProperty('role');
    expect(result.data).toHaveProperty('created_at');
  });
});
