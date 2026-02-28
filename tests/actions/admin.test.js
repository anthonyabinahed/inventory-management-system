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

const { verifyAdmin, inviteUser, updateUserRole, revokeUser, reactivateUser, updateEmailAlertPreference } = await import('@/actions/admin');
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

// ============ revokeUser (soft-delete) ============

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

  it('deactivates user when caller is admin and verifies in DB', async () => {
    // Create a throwaway user to deactivate
    const { user: throwaway } = await createTestUser({
      email: 'deactivate-target@test.com',
      role: 'user',
    });

    currentClient = adminClient;
    const result = await revokeUser(throwaway.id);
    expect(result.success).toBe(true);

    // Verify profile still exists but is_active = false
    const admin = getAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('id, is_active, receive_email_alerts')
      .eq('id', throwaway.id)
      .maybeSingle();
    expect(profile).not.toBeNull();
    expect(profile.is_active).toBe(false);
    expect(profile.receive_email_alerts).toBe(false);

    // Verify audit log was created
    const { data: logs } = await adminClient
      .from('audit_logs')
      .select('action, resource_type, resource_id')
      .eq('action', 'deactivate_user')
      .eq('resource_id', throwaway.id)
      .order('performed_at', { ascending: false })
      .limit(1);
    expect(logs).toHaveLength(1);
    expect(logs[0].resource_type).toBe('user');
  });

  it('preserves audit trail after deactivation', async () => {
    // Create a user with stock movements and audit logs
    const { user: targetUser } = await createTestUser({
      email: 'preserve-trail@test.com',
      role: 'user',
    });

    const admin = getAdminClient();

    // Insert audit log for this user
    const { data: auditLog } = await admin
      .from('audit_logs')
      .insert({
        action: 'stock_in',
        resource_type: 'lot',
        resource_id: 'test-lot-id',
        description: 'Test stock in by user',
        user_id: targetUser.id,
      })
      .select()
      .single();

    // Insert stock movement for this user (need a reagent + lot first)
    const { data: reagent } = await admin
      .from('reagents')
      .insert({
        name: `Trail Reagent ${Date.now()}`,
        reference: `TRAIL-${Date.now()}`,
        supplier: 'Test',
        category: 'reagent',
        storage_location: 'Room A',
        storage_temperature: '2-8°C',
        sector: 'Serology',
        unit: 'vials',
      })
      .select()
      .single();

    const { data: lot } = await admin
      .from('lots')
      .insert({
        reagent_id: reagent.id,
        lot_number: `TRAIL-LOT-${Date.now()}`,
        quantity: 10,
        expiry_date: '2027-01-01',
        date_of_reception: '2026-01-01',
      })
      .select()
      .single();

    const { data: movement } = await admin
      .from('stock_movements')
      .insert({
        lot_id: lot.id,
        movement_type: 'in',
        quantity: 10,
        quantity_before: 0,
        quantity_after: 10,
        performed_by: targetUser.id,
      })
      .select()
      .single();

    // Now deactivate the user
    currentClient = adminClient;
    const result = await revokeUser(targetUser.id);
    expect(result.success).toBe(true);

    // Verify audit log still exists with user reference
    const { data: savedLog } = await admin
      .from('audit_logs')
      .select('user_id')
      .eq('id', auditLog.id)
      .single();
    expect(savedLog.user_id).toBe(targetUser.id);

    // Verify stock movement still exists with user reference
    const { data: savedMovement } = await admin
      .from('stock_movements')
      .select('performed_by')
      .eq('id', movement.id)
      .single();
    expect(savedMovement.performed_by).toBe(targetUser.id);
  });

  it('rolls back Auth ban when DB transaction fails', async () => {
    // Create a user, then delete their profile to force RPC failure
    const { user: targetUser } = await createTestUser({
      email: 'rollback-ban@test.com',
      role: 'user',
    });

    const admin = getAdminClient();

    // Delete the profile row (but keep the auth user) to make RPC raise "Profile not found"
    await admin.from('audit_logs').delete().eq('user_id', targetUser.id);
    await admin.from('profiles').delete().eq('id', targetUser.id);

    currentClient = adminClient;
    const result = await revokeUser(targetUser.id);
    expect(result.success).toBe(false);

    // Verify compensating action: user should NOT be banned (can still sign in)
    const testClient = getAnonClient();
    const { error: signInError } = await testClient.auth.signInWithPassword({
      email: 'rollback-ban@test.com',
      password: 'TestPass123!',
    });
    expect(signInError).toBeNull();
  });

  it('cancels pending export jobs on deactivation', async () => {
    const { user: targetUser } = await createTestUser({
      email: 'cancel-exports@test.com',
      role: 'user',
    });

    const admin = getAdminClient();

    // Insert a pending export job
    const { data: job } = await admin
      .from('export_jobs')
      .insert({
        user_id: targetUser.id,
        status: 'pending',
      })
      .select()
      .single();

    // Deactivate
    currentClient = adminClient;
    const result = await revokeUser(targetUser.id);
    expect(result.success).toBe(true);

    // Verify export job was cancelled
    const { data: updatedJob } = await admin
      .from('export_jobs')
      .select('status, error_message')
      .eq('id', job.id)
      .single();
    expect(updatedJob.status).toBe('failed');
    expect(updatedJob.error_message).toBe('User account deactivated');
  });
});

// ============ reactivateUser ============

describe('reactivateUser', () => {
  it('blocks non-admin caller', async () => {
    currentClient = regularClient;
    const result = await reactivateUser('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Forbidden: Admin access required');
  });

  it('blocks unauthenticated caller', async () => {
    currentClient = getAnonClient();
    const result = await reactivateUser('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });

  it('reactivates a deactivated user and verifies in DB', async () => {
    // Create and deactivate a user
    const { user: targetUser } = await createTestUser({
      email: 'reactivate-target@test.com',
      role: 'user',
    });

    const admin = getAdminClient();

    // Deactivate first
    currentClient = adminClient;
    await revokeUser(targetUser.id);

    // Verify deactivated
    const { data: deactivated } = await admin
      .from('profiles')
      .select('is_active')
      .eq('id', targetUser.id)
      .single();
    expect(deactivated.is_active).toBe(false);

    // Reactivate
    const result = await reactivateUser(targetUser.id);
    expect(result.success).toBe(true);

    // Verify reactivated
    const { data: reactivated } = await admin
      .from('profiles')
      .select('is_active')
      .eq('id', targetUser.id)
      .single();
    expect(reactivated.is_active).toBe(true);

    // Verify audit log
    const { data: logs } = await adminClient
      .from('audit_logs')
      .select('action, resource_id')
      .eq('action', 'reactivate_user')
      .eq('resource_id', targetUser.id)
      .order('performed_at', { ascending: false })
      .limit(1);
    expect(logs).toHaveLength(1);
  });

  it('rolls back Auth unban when DB transaction fails', async () => {
    // Create a user, deactivate, then delete their profile to force RPC failure
    const { user: targetUser } = await createTestUser({
      email: 'rollback-unban1234@test.com',
      role: 'user',
    });

    const admin = getAdminClient();

    // Deactivate first (this bans the auth user)
    currentClient = adminClient;
    await revokeUser(targetUser.id);

    // Delete the profile row to make the reactivation RPC fail
    await admin.from('audit_logs').delete().eq('user_id', targetUser.id);
    await admin.from('profiles').delete().eq('id', targetUser.id);

    const result = await reactivateUser(targetUser.id);
    expect(result.success).toBe(false);

    // Verify compensating action: user should still be banned (re-banned after RPC failure)
    const testClient = getAnonClient();
    const { error: signInError } = await testClient.auth.signInWithPassword({
      email: 'rollback-unban1234@test.com',
      password: 'TestPass123!',
    });
    expect(signInError).not.toBeNull();

    // Clean up the orphaned auth user (profile was deleted above, so
    // deleteUserByEmail won't find it — delete directly by ID)
    await admin.auth.admin.updateUserById(targetUser.id, { ban_duration: 'none' });
    await admin.auth.admin.deleteUser(targetUser.id);
  });

  it('does not re-enable email alerts on reactivation', async () => {
    const { user: targetUser } = await createTestUser({
      email: 'no-re-enable-alerts@test.com',
      role: 'user',
    });

    const admin = getAdminClient();

    // Enable alerts first
    await admin.from('profiles').update({ receive_email_alerts: true }).eq('id', targetUser.id);

    // Deactivate (sets alerts to false)
    currentClient = adminClient;
    await revokeUser(targetUser.id);

    // Reactivate
    await reactivateUser(targetUser.id);

    // Verify alerts are still false
    const { data: profile } = await admin
      .from('profiles')
      .select('receive_email_alerts')
      .eq('id', targetUser.id)
      .single();
    expect(profile.receive_email_alerts).toBe(false);
  });
});

// ============ updateEmailAlertPreference ============

describe('updateEmailAlertPreference', () => {
  it('returns validation error for invalid UUID', async () => {
    const result = await updateEmailAlertPreference('not-a-uuid', true);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Invalid user ID');
  });

  it('returns validation error for non-boolean value', async () => {
    const result = await updateEmailAlertPreference(
      '550e8400-e29b-41d4-a716-446655440000',
      'yes'
    );
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('blocks non-admin caller', async () => {
    currentClient = regularClient;
    const result = await updateEmailAlertPreference(regularUser.id, true);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Forbidden: Admin access required');
  });

  it('blocks unauthenticated caller', async () => {
    currentClient = getAnonClient();
    const result = await updateEmailAlertPreference(regularUser.id, true);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });

  it('enables alerts when caller is admin and verifies in DB', async () => {
    currentClient = adminClient;
    const result = await updateEmailAlertPreference(regularUser.id, true);
    expect(result.success).toBe(true);

    const admin = getAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('receive_email_alerts')
      .eq('id', regularUser.id)
      .single();
    expect(profile.receive_email_alerts).toBe(true);
  });

  it('disables alerts when caller is admin and verifies in DB', async () => {
    currentClient = adminClient;
    const result = await updateEmailAlertPreference(regularUser.id, false);
    expect(result.success).toBe(true);

    const admin = getAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('receive_email_alerts')
      .eq('id', regularUser.id)
      .single();
    expect(profile.receive_email_alerts).toBe(false);
  });

  it('creates audit log entry', async () => {
    currentClient = adminClient;
    await updateEmailAlertPreference(regularUser.id, true);

    // Query via the same authenticated client used by the action
    const { data: logs, error } = await adminClient
      .from('audit_logs')
      .select('action, resource_type, resource_id')
      .eq('action', 'update_email_alerts')
      .order('performed_at', { ascending: false })
      .limit(1);

    expect(error).toBeNull();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('update_email_alerts');
    expect(logs[0].resource_type).toBe('user');
    expect(logs[0].resource_id).toBe(regularUser.id);

    // Cleanup: disable alerts for other tests
    const admin = getAdminClient();
    await admin.from('profiles').update({ receive_email_alerts: false }).eq('id', regularUser.id);
  });
});
