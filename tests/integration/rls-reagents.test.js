import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getAnonClient, createTestUser, createTestReagent, cleanupAll } from '../helpers/supabase.js';

let userClient, user;
let anonClient;
let testReagent;

beforeAll(async () => {
  await cleanupAll();

  ({ user, client: userClient } = await createTestUser({
    email: 'rls-reagents-user@test.com',
    role: 'user',
  }));

  anonClient = getAnonClient();

  // Create a reagent via admin for read tests
  testReagent = await createTestReagent({ created_by: user.id, updated_by: user.id });
});

afterAll(async () => {
  await cleanupAll();
});

// ============ Unauthenticated ============

describe('unauthenticated access', () => {
  it('anon cannot select reagents', async () => {
    const { data } = await anonClient.from('reagents').select('*');
    expect(data?.length ?? 0).toBe(0);
  });

  it('anon cannot insert reagents', async () => {
    const { error } = await anonClient.from('reagents').insert({
      name: 'Hacker Reagent',
      reference: 'HACK-001',
      supplier: 'Evil Corp',
      category: 'reagent',
      storage_location: 'Room X',
      storage_temperature: '20°C',
      sector: 'Serology',
      unit: 'vials',
    });
    expect(error).not.toBeNull();
  });
});

// ============ Authenticated user ============

describe('authenticated user', () => {
  it('can select reagents', async () => {
    const { data, error } = await userClient.from('reagents').select('*');
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.some((r) => r.id === testReagent.id)).toBe(true);
  });

  it('can insert a reagent', async () => {
    const { data, error } = await userClient
      .from('reagents')
      .insert({
        name: 'User Created Reagent',
        reference: `USER-REF-${Date.now()}`,
        supplier: 'Good Corp',
        category: 'control',
        storage_location: 'Room B',
        storage_temperature: '15-25°C',
        sector: 'Urinalysis',
        unit: 'tests',
        minimum_stock: 3,
        total_quantity: 0,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.name).toBe('User Created Reagent');
  });

  it('can update a reagent', async () => {
    const { error } = await userClient
      .from('reagents')
      .update({ name: 'Updated Reagent Name', updated_by: user.id })
      .eq('id', testReagent.id);
    expect(error).toBeNull();

    const { data } = await userClient
      .from('reagents')
      .select('name')
      .eq('id', testReagent.id)
      .single();
    expect(data.name).toBe('Updated Reagent Name');
  });

  it('cannot hard-delete a reagent (no DELETE grant)', async () => {
    const { error } = await userClient
      .from('reagents')
      .delete()
      .eq('id', testReagent.id);
    // No DELETE grant on reagents table — should fail
    // Verify reagent still exists
    const { data } = await userClient
      .from('reagents')
      .select('id')
      .eq('id', testReagent.id)
      .single();
    expect(data).not.toBeNull();
  });
});
