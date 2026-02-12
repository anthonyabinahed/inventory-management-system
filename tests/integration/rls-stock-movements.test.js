import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getAnonClient,
  getAdminClient,
  createTestUser,
  createTestReagent,
  createTestLot,
  cleanupAll,
} from '../helpers/supabase.js';

let userClient, user;
let anonClient;
let testLot;

beforeAll(async () => {
  await cleanupAll();

  ({ user, client: userClient } = await createTestUser({
    email: 'rls-movements-user@test.com',
    role: 'user',
  }));

  anonClient = getAnonClient();

  const testReagent = await createTestReagent({
    created_by: user.id,
    updated_by: user.id,
  });

  testLot = await createTestLot(testReagent.id, {
    created_by: user.id,
    updated_by: user.id,
  });

  // Insert a stock movement via admin for read tests
  const admin = getAdminClient();
  await admin.from('stock_movements').insert({
    lot_id: testLot.id,
    movement_type: 'in',
    quantity: 10,
    quantity_before: 0,
    quantity_after: 10,
    performed_by: user.id,
  });
});

afterAll(async () => {
  await cleanupAll();
});

// ============ Unauthenticated ============

describe('unauthenticated access', () => {
  it('anon cannot select stock movements', async () => {
    const { data } = await anonClient.from('stock_movements').select('*');
    expect(data?.length ?? 0).toBe(0);
  });
});

// ============ Authenticated user ============

describe('authenticated user', () => {
  it('can select stock movements', async () => {
    const { data, error } = await userClient.from('stock_movements').select('*');
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('can insert a stock movement', async () => {
    const { data, error } = await userClient
      .from('stock_movements')
      .insert({
        lot_id: testLot.id,
        movement_type: 'out',
        quantity: -2,
        quantity_before: 10,
        quantity_after: 8,
        performed_by: user.id,
        notes: 'Test movement',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.movement_type).toBe('out');
  });

  it('cannot update a stock movement (immutable)', async () => {
    // Get an existing movement
    const { data: movements } = await userClient
      .from('stock_movements')
      .select('id, notes')
      .limit(1);

    const originalNotes = movements[0].notes;

    await userClient
      .from('stock_movements')
      .update({ notes: 'Tampered' })
      .eq('id', movements[0].id);

    // Verify data was NOT changed (no UPDATE grant or policy — silently affects 0 rows)
    const { data: after } = await userClient
      .from('stock_movements')
      .select('notes')
      .eq('id', movements[0].id)
      .single();
    expect(after.notes).toBe(originalNotes);
  });

  it('cannot delete a stock movement (immutable)', async () => {
    const { data: movements } = await userClient
      .from('stock_movements')
      .select('id')
      .limit(1);

    const { error } = await userClient
      .from('stock_movements')
      .delete()
      .eq('id', movements[0].id);

    // No DELETE grant or policy — should fail
    // Verify movement still exists
    const { data } = await userClient
      .from('stock_movements')
      .select('id')
      .eq('id', movements[0].id)
      .single();
    expect(data).not.toBeNull();
  });
});
