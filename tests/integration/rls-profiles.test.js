import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getAnonClient, getAdminClient, createTestUser, cleanupAll } from '../helpers/supabase.js';

let adminUser, adminClient;
let regularUser, regularClient;
let anonClient;

beforeAll(async () => {
  await cleanupAll();

  ({ user: adminUser, client: adminClient } = await createTestUser({
    email: 'rls-profiles-admin@test.com',
    role: 'admin',
    fullName: 'Admin User',
  }));

  ({ user: regularUser, client: regularClient } = await createTestUser({
    email: 'rls-profiles-user@test.com',
    role: 'user',
    fullName: 'Regular User',
  }));

  anonClient = getAnonClient();
});

afterAll(async () => {
  await cleanupAll();
});

// ============ Unauthenticated ============

describe('unauthenticated access', () => {
  it('anon cannot select profiles', async () => {
    const { data, error } = await anonClient.from('profiles').select('*');
    // RLS blocks: either error or empty data
    expect(data?.length ?? 0).toBe(0);
  });

  it('anon cannot insert profiles', async () => {
    const { error } = await anonClient.from('profiles').insert({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'hacker@test.com',
      role: 'admin',
    });
    expect(error).not.toBeNull();
  });
});

// ============ Regular user ============

describe('regular user', () => {
  it('can select all profiles', async () => {
    const { data, error } = await regularClient.from('profiles').select('*');
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThanOrEqual(2); // admin + regular
  });

  it('cannot insert a profile', async () => {
    const { error } = await regularClient.from('profiles').insert({
      id: '00000000-0000-0000-0000-000000000002',
      email: 'sneaky@test.com',
      role: 'user',
    });
    expect(error).not.toBeNull();
  });

  it('can update own profile', async () => {
    const { error } = await regularClient
      .from('profiles')
      .update({ full_name: 'Updated Name' })
      .eq('id', regularUser.id);
    expect(error).toBeNull();

    // Verify the update
    const { data } = await regularClient
      .from('profiles')
      .select('full_name')
      .eq('id', regularUser.id)
      .single();
    expect(data.full_name).toBe('Updated Name');
  });

  it('cannot update another user profile', async () => {
    const { error } = await regularClient
      .from('profiles')
      .update({ full_name: 'Hacked Name' })
      .eq('id', adminUser.id);
    // RLS should block — either error or 0 rows affected
    // Supabase returns no error but updates 0 rows when RLS blocks
    if (!error) {
      const { data } = await adminClient
        .from('profiles')
        .select('full_name')
        .eq('id', adminUser.id)
        .single();
      expect(data.full_name).not.toBe('Hacked Name');
    }
  });

  it('cannot delete any profile', async () => {
    const { error } = await regularClient
      .from('profiles')
      .delete()
      .eq('id', adminUser.id);
    // Should fail: no DELETE policy for regular users
    // Verify admin profile still exists
    const { data } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', adminUser.id)
      .single();
    expect(data).not.toBeNull();
  });
});

// ============ Admin user ============

describe('admin user', () => {
  it('can select all profiles', async () => {
    const { data, error } = await adminClient.from('profiles').select('*');
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThanOrEqual(2);
  });

  it('can update any profile', async () => {
    const { error } = await adminClient
      .from('profiles')
      .update({ full_name: 'Admin Updated This' })
      .eq('id', regularUser.id);
    expect(error).toBeNull();

    const { data } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', regularUser.id)
      .single();
    expect(data.full_name).toBe('Admin Updated This');
  });

  it('cannot delete own profile', async () => {
    const { error, count } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', adminUser.id);
    // RLS policy: id != auth.uid() — should block self-deletion
    const { data } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', adminUser.id)
      .single();
    expect(data).not.toBeNull();
  });

  it('can delete another user profile', async () => {
    // Create a throwaway user to delete
    const { user: throwaway } = await createTestUser({
      email: 'rls-profiles-throwaway@test.com',
      role: 'user',
    });

    const { error } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', throwaway.id);
    expect(error).toBeNull();

    // Verify profile is gone
    const { data } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', throwaway.id)
      .maybeSingle();
    expect(data).toBeNull();
  });
});

// ============ Deactivated user RLS ============

describe('deactivated user RLS', () => {
  it('deactivated admin cannot update profiles', async () => {
    const { user: deactivatedAdmin, client: deactivatedAdminClient } = await createTestUser({
      email: 'rls-deactivated-admin@test.com',
      role: 'admin',
      fullName: 'Deactivated Admin',
    });

    const serviceRole = getAdminClient();
    // Deactivate via service role
    await serviceRole.from('profiles').update({ is_active: false }).eq('id', deactivatedAdmin.id);

    // Try to update another profile
    await deactivatedAdminClient
      .from('profiles')
      .update({ full_name: 'Should Not Work' })
      .eq('id', regularUser.id);

    // Verify the update did NOT happen
    const { data } = await serviceRole
      .from('profiles')
      .select('full_name')
      .eq('id', regularUser.id)
      .single();
    expect(data.full_name).not.toBe('Should Not Work');
  });

  it('deactivated admin cannot delete profiles', async () => {
    const { user: deactivatedAdmin, client: deactivatedAdminClient } = await createTestUser({
      email: 'rls-deact-admin-del@test.com',
      role: 'admin',
      fullName: 'Deactivated Admin Del',
    });

    const { user: throwaway } = await createTestUser({
      email: 'rls-deact-target@test.com',
      role: 'user',
    });

    const serviceRole = getAdminClient();
    await serviceRole.from('profiles').update({ is_active: false }).eq('id', deactivatedAdmin.id);

    // Try to delete
    await deactivatedAdminClient
      .from('profiles')
      .delete()
      .eq('id', throwaway.id);

    // Verify the target was NOT deleted
    const { data } = await serviceRole
      .from('profiles')
      .select('id')
      .eq('id', throwaway.id)
      .maybeSingle();
    expect(data).not.toBeNull();
  });

  it('deactivated admin cannot insert profiles', async () => {
    const { user: deactivatedAdmin, client: deactivatedAdminClient } = await createTestUser({
      email: 'rls-deact-admin-ins@test.com',
      role: 'admin',
      fullName: 'Deactivated Admin Ins',
    });

    const serviceRole = getAdminClient();
    await serviceRole.from('profiles').update({ is_active: false }).eq('id', deactivatedAdmin.id);

    // Try to insert
    const { error } = await deactivatedAdminClient
      .from('profiles')
      .insert({
        id: '00000000-0000-0000-0000-000000000099',
        email: 'injected@test.com',
        role: 'admin',
      });

    expect(error).not.toBeNull();
  });

  it('deactivated user cannot update own profile', async () => {
    const { user: deactivatedUser, client: deactivatedUserClient } = await createTestUser({
      email: 'rls-deact-self-update@test.com',
      role: 'user',
      fullName: 'Deactivated Self Update',
    });

    const serviceRole = getAdminClient();
    await serviceRole.from('profiles').update({ is_active: false }).eq('id', deactivatedUser.id);

    // Try to update own profile
    await deactivatedUserClient
      .from('profiles')
      .update({ full_name: 'Should Not Work' })
      .eq('id', deactivatedUser.id);

    // Verify the update did NOT happen
    const { data } = await serviceRole
      .from('profiles')
      .select('full_name')
      .eq('id', deactivatedUser.id)
      .single();
    expect(data.full_name).not.toBe('Should Not Work');
  });
});
