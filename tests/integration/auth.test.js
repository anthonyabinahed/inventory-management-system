import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  getAdminClient,
  createTestUser,
  deleteUserByEmail,
  cleanupAll,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from '../helpers/supabase.js';

beforeAll(async () => {
  await cleanupAll();
});

afterAll(async () => {
  await cleanupAll();
});

// ============ Signup & Profile trigger ============

describe('signup and profile trigger', () => {
  it('creating a user auto-creates a profile via handle_new_user trigger', async () => {
    const admin = getAdminClient();
    await deleteUserByEmail('trigger-test@test.com');

    const { data: { user }, error } = await admin.auth.admin.createUser({
      email: 'trigger-test@test.com',
      password: 'TestPass123!',
      email_confirm: true,
      user_metadata: { full_name: 'Trigger Test', role: 'user' },
    });
    expect(error).toBeNull();

    // Wait for trigger
    await new Promise((r) => setTimeout(r, 200));

    // Check profile was created
    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    expect(profile).not.toBeNull();
    expect(profile.email).toBe('trigger-test@test.com');
    expect(profile.full_name).toBe('Trigger Test');
    expect(profile.role).toBe('user');
  });

  it('profile created with custom role via user_metadata', async () => {
    const admin = getAdminClient();
    await deleteUserByEmail('admin-trigger@test.com');

    const { data: { user } } = await admin.auth.admin.createUser({
      email: 'admin-trigger@test.com',
      password: 'TestPass123!',
      email_confirm: true,
      user_metadata: { full_name: 'Admin Trigger', role: 'admin' },
    });

    await new Promise((r) => setTimeout(r, 200));

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    expect(profile.role).toBe('admin');
  });
});

// ============ Login ============

describe('login', () => {
  let testEmail = 'login-test@test.com';
  let testPassword = 'LoginPass123!';

  beforeAll(async () => {
    const admin = getAdminClient();
    await deleteUserByEmail(testEmail);
    await admin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Login Test' },
    });
  });

  it('can sign in with valid credentials', async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await client.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    expect(error).toBeNull();
    expect(data.user).not.toBeNull();
    expect(data.user.email).toBe(testEmail);
    expect(data.session).not.toBeNull();
  });

  it('fails with wrong password', async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await client.auth.signInWithPassword({
      email: testEmail,
      password: 'WrongPassword123!',
    });

    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });

  it('fails with non-existent email', async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await client.auth.signInWithPassword({
      email: 'nobody@test.com',
      password: 'SomePass123!',
    });

    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });
});

// ============ Session ============

describe('session', () => {
  it('authenticated client can access protected data', async () => {
    const { client } = await createTestUser({
      email: 'session-test@test.com',
      role: 'user',
    });

    const { data, error } = await client.from('profiles').select('*');
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('signed-out client cannot access protected data', async () => {
    const { client } = await createTestUser({
      email: 'signout-test@test.com',
      role: 'user',
    });

    // Sign out
    await client.auth.signOut();

    // Try to access protected data
    const { data } = await client.from('profiles').select('*');
    expect(data?.length ?? 0).toBe(0);
  });
});

// ============ Password update ============

describe('password update', () => {
  it('can update password and login with new password', async () => {
    const email = 'password-update@test.com';
    const oldPassword = 'OldPass123!';
    const newPassword = 'NewPass456!';

    const { client } = await createTestUser({ email, password: oldPassword });

    // Update password
    const { error: updateError } = await client.auth.updateUser({
      password: newPassword,
    });
    expect(updateError).toBeNull();

    // Login with new password
    const freshClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await freshClient.auth.signInWithPassword({
      email,
      password: newPassword,
    });
    expect(error).toBeNull();
    expect(data.user.email).toBe(email);
  });
});
