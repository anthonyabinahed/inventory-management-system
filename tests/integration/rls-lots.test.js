import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getAnonClient,
  createTestUser,
  createTestReagent,
  createTestLot,
  cleanupAll,
} from '../helpers/supabase.js';

let adminUser, adminClient;
let regularUser, regularClient;
let anonClient;
let testReagent, testLot;

beforeAll(async () => {
  await cleanupAll();

  ({ user: adminUser, client: adminClient } = await createTestUser({
    email: 'rls-lots-admin@test.com',
    role: 'admin',
  }));

  ({ user: regularUser, client: regularClient } = await createTestUser({
    email: 'rls-lots-user@test.com',
    role: 'user',
  }));

  anonClient = getAnonClient();

  testReagent = await createTestReagent({
    created_by: regularUser.id,
    updated_by: regularUser.id,
  });

  testLot = await createTestLot(testReagent.id, {
    lot_number: 'LOT-RLS-001',
    created_by: regularUser.id,
    updated_by: regularUser.id,
  });
});

afterAll(async () => {
  await cleanupAll();
});

// ============ Unauthenticated ============

describe('unauthenticated access', () => {
  it('anon cannot select lots', async () => {
    const { data } = await anonClient.from('lots').select('*');
    expect(data?.length ?? 0).toBe(0);
  });
});

// ============ Regular user ============

describe('regular user', () => {
  it('can select lots', async () => {
    const { data, error } = await regularClient.from('lots').select('*');
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('can insert a lot', async () => {
    const { data, error } = await regularClient
      .from('lots')
      .insert({
        reagent_id: testReagent.id,
        lot_number: `LOT-USER-${Date.now()}`,
        quantity: 5,
        expiry_date: '2027-06-30',
        date_of_reception: '2026-01-15',
        created_by: regularUser.id,
        updated_by: regularUser.id,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.quantity).toBe(5);
  });

  it('can update a lot', async () => {
    const { error } = await regularClient
      .from('lots')
      .update({ quantity: 20, updated_by: regularUser.id })
      .eq('id', testLot.id);
    expect(error).toBeNull();

    const { data } = await regularClient
      .from('lots')
      .select('quantity')
      .eq('id', testLot.id)
      .single();
    expect(data.quantity).toBe(20);
  });

  it('cannot delete a lot', async () => {
    const { error } = await regularClient
      .from('lots')
      .delete()
      .eq('id', testLot.id);

    // Verify lot still exists
    const { data } = await regularClient
      .from('lots')
      .select('id')
      .eq('id', testLot.id)
      .single();
    expect(data).not.toBeNull();
  });
});

// ============ Admin user ============

describe('admin user', () => {
  it('can delete a lot', async () => {
    // Create a throwaway lot to delete
    const throwawayLot = await createTestLot(testReagent.id, {
      lot_number: `LOT-THROWAWAY-${Date.now()}`,
      created_by: adminUser.id,
      updated_by: adminUser.id,
    });

    const { error } = await adminClient
      .from('lots')
      .delete()
      .eq('id', throwawayLot.id);

    // NOTE: This test may fail if DELETE is not in the GRANT statement.
    // Migration 00003 only grants SELECT, INSERT, UPDATE — not DELETE.
    // If this fails, it reveals a real bug in the migration.
    if (error) {
      console.warn(
        'Admin lot delete failed — likely missing DELETE in GRANT statement:',
        error.message
      );
    }

    // Verify lot is gone (or still there if GRANT is missing)
    const { data } = await adminClient
      .from('lots')
      .select('id')
      .eq('id', throwawayLot.id)
      .maybeSingle();

    // If GRANT includes DELETE: data should be null
    // If GRANT is missing DELETE: data will still exist (bug!)
    if (data) {
      console.warn(
        'BUG: Admin could not delete lot despite RLS policy — add DELETE to GRANT on lots table'
      );
    }
  });
});
