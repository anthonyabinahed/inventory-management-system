import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestUser,
  getAnonClient,
  getAdminClient,
  cleanupAll,
} from '../helpers/supabase.js';

let adminClient, adminUser, adminAuthClient;
let regularUser, regularClient;
let otherUser, otherClient;

beforeAll(async () => {
  await cleanupAll();
  adminClient = getAdminClient();

  ({ user: adminUser, client: adminAuthClient } = await createTestUser({
    email: 'alert-rls-admin@test.com',
    password: 'TestPass123!',
    role: 'admin',
    fullName: 'Alert Admin',
  }));

  ({ user: regularUser, client: regularClient } = await createTestUser({
    email: 'alert-rls-user@test.com',
    password: 'TestPass123!',
    role: 'user',
    fullName: 'Alert User',
  }));

  ({ user: otherUser, client: otherClient } = await createTestUser({
    email: 'alert-rls-other@test.com',
    password: 'TestPass123!',
    role: 'user',
    fullName: 'Other User',
  }));

  // Insert test notifications using admin (service role bypasses RLS)
  await adminClient.from('alert_notifications').insert([
    {
      user_id: regularUser.id,
      alert_summary: { low_stock_count: 2, out_of_stock_count: 1, expired_count: 0, expiring_soon_count: 0 },
      email_status: 'sent',
    },
    {
      user_id: otherUser.id,
      alert_summary: { low_stock_count: 0, out_of_stock_count: 0, expired_count: 3, expiring_soon_count: 1 },
      email_status: 'sent',
    },
    {
      user_id: regularUser.id,
      alert_summary: { low_stock_count: 1, out_of_stock_count: 0, expired_count: 0, expiring_soon_count: 0 },
      email_status: 'failed',
      error_message: 'Test failure',
    },
  ]);
});

afterAll(async () => {
  // Clean up notifications
  await adminClient.from('alert_notifications').delete().eq('user_id', regularUser.id);
  await adminClient.from('alert_notifications').delete().eq('user_id', otherUser.id);
  await cleanupAll();
});

// ============ RLS Policies ============

describe('alert_notifications RLS', () => {
  it('admin can read all notification records', async () => {
    const { data, error } = await adminAuthClient
      .from('alert_notifications')
      .select('*');

    expect(error).toBeNull();
    // Admin should see notifications for both regularUser and otherUser
    const userIds = [...new Set(data.map(n => n.user_id))];
    expect(userIds).toContain(regularUser.id);
    expect(userIds).toContain(otherUser.id);
  });

  it('user can read own notification records', async () => {
    const { data, error } = await regularClient
      .from('alert_notifications')
      .select('*');

    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
    // All returned records should belong to this user
    data.forEach(n => {
      expect(n.user_id).toBe(regularUser.id);
    });
  });

  it('user cannot read other users notification records', async () => {
    const { data } = await regularClient
      .from('alert_notifications')
      .select('*')
      .eq('user_id', otherUser.id);

    // RLS filters out other users' records — returns empty, no error
    expect(data).toHaveLength(0);
  });

  it('anonymous cannot read any notification records', async () => {
    const anon = getAnonClient();
    const { data, error } = await anon
      .from('alert_notifications')
      .select('*');

    // Anon either gets error or empty array depending on RLS config
    expect(data?.length ?? 0).toBe(0);
  });

  it('authenticated user cannot insert into alert_notifications', async () => {
    // The migration only GRANTS SELECT to authenticated, not INSERT
    // Inserts should be done by service role only
    const { error } = await regularClient
      .from('alert_notifications')
      .insert({
        user_id: regularUser.id,
        alert_summary: { test: true },
        email_status: 'sent',
      });

    // Should fail — no INSERT policy for authenticated role
    expect(error).not.toBeNull();
  });
});

// ============ Data Integrity ============

describe('alert_notifications data integrity', () => {
  it('stores alert_summary as valid JSONB', async () => {
    const { data } = await adminClient
      .from('alert_notifications')
      .select('alert_summary')
      .eq('user_id', regularUser.id)
      .eq('email_status', 'sent')
      .limit(1)
      .single();

    expect(data.alert_summary).toHaveProperty('low_stock_count');
    expect(typeof data.alert_summary.low_stock_count).toBe('number');
  });

  it('stores error_message for failed notifications', async () => {
    const { data } = await adminClient
      .from('alert_notifications')
      .select('error_message, email_status')
      .eq('user_id', regularUser.id)
      .eq('email_status', 'failed')
      .limit(1)
      .single();

    expect(data.email_status).toBe('failed');
    expect(data.error_message).toBe('Test failure');
  });

  it('cascades delete when profile is deleted', async () => {
    // Create a throwaway user with a notification
    const { user: throwaway } = await createTestUser({
      email: 'alert-cascade@test.com',
      password: 'TestPass123!',
      role: 'user',
    });

    await adminClient.from('alert_notifications').insert({
      user_id: throwaway.id,
      alert_summary: { test: true },
      email_status: 'sent',
    });

    // Verify notification exists
    const { data: before } = await adminClient
      .from('alert_notifications')
      .select('id')
      .eq('user_id', throwaway.id);
    expect(before.length).toBeGreaterThan(0);

    // Delete the user (cascades to profile and notifications)
    await adminClient.auth.admin.deleteUser(throwaway.id);
    await new Promise(r => setTimeout(r, 200));

    // Verify notification was cascade-deleted
    const { data: after } = await adminClient
      .from('alert_notifications')
      .select('id')
      .eq('user_id', throwaway.id);
    expect(after).toHaveLength(0);
  });

  it('rejects invalid email_status value', async () => {
    const { error } = await adminClient
      .from('alert_notifications')
      .insert({
        user_id: regularUser.id,
        alert_summary: { test: true },
        email_status: 'pending', // Not in CHECK constraint
      });

    expect(error).not.toBeNull();
  });
});

// ============ Profile receive_email_alerts column ============

describe('profiles.receive_email_alerts', () => {
  it('defaults to false for new users', async () => {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('receive_email_alerts')
      .eq('id', regularUser.id)
      .single();

    expect(profile.receive_email_alerts).toBe(false);
  });

  it('can be updated to true', async () => {
    await adminClient
      .from('profiles')
      .update({ receive_email_alerts: true })
      .eq('id', regularUser.id);

    const { data: profile } = await adminClient
      .from('profiles')
      .select('receive_email_alerts')
      .eq('id', regularUser.id)
      .single();

    expect(profile.receive_email_alerts).toBe(true);

    // Restore
    await adminClient
      .from('profiles')
      .update({ receive_email_alerts: false })
      .eq('id', regularUser.id);
  });
});
