import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getAnonClient,
  getAdminClient,
  createTestUser,
  cleanupAll,
} from '../helpers/supabase.js';

let userClient, user;
let anonClient;
let insertedLogId;

beforeAll(async () => {
  await cleanupAll();

  ({ user, client: userClient } = await createTestUser({
    email: 'rls-audit-user@test.com',
    role: 'user',
  }));

  anonClient = getAnonClient();

  // Insert an audit log via admin for read tests
  const admin = getAdminClient();
  const { data } = await admin
    .from('audit_logs')
    .insert({
      action: 'create_reagent',
      resource_type: 'reagent',
      resource_id: 'test-reagent-id',
      description: 'Created reagent "Test Reagent"',
      user_id: user.id,
    })
    .select()
    .single();

  insertedLogId = data.id;
});

afterAll(async () => {
  await cleanupAll();
});

// ============ Unauthenticated ============

describe('unauthenticated access', () => {
  it('anon cannot select audit logs', async () => {
    const { data } = await anonClient.from('audit_logs').select('*');
    expect(data?.length ?? 0).toBe(0);
  });
});

// ============ Authenticated user ============

describe('authenticated user', () => {
  it('can select audit logs', async () => {
    const { data, error } = await userClient.from('audit_logs').select('*');
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('can insert an audit log', async () => {
    const { data, error } = await userClient
      .from('audit_logs')
      .insert({
        action: 'stock_in',
        resource_type: 'lot',
        resource_id: 'test-lot-id',
        description: 'Stocked in 10 to lot TEST-001',
        user_id: user.id,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.action).toBe('stock_in');
    expect(data.description).toBe('Stocked in 10 to lot TEST-001');
  });

  it('cannot update an audit log (immutable)', async () => {
    // Get an existing log
    const { data: logs } = await userClient
      .from('audit_logs')
      .select('id, description')
      .limit(1);

    const originalDescription = logs[0].description;

    await userClient
      .from('audit_logs')
      .update({ description: 'Tampered' })
      .eq('id', logs[0].id);

    // Verify data was NOT changed (no UPDATE grant — silently affects 0 rows)
    const { data: after } = await userClient
      .from('audit_logs')
      .select('description')
      .eq('id', logs[0].id)
      .single();
    expect(after.description).toBe(originalDescription);
  });

  it('cannot delete an audit log (immutable)', async () => {
    const { data: logs } = await userClient
      .from('audit_logs')
      .select('id')
      .limit(1);

    await userClient
      .from('audit_logs')
      .delete()
      .eq('id', logs[0].id);

    // Verify log still exists
    const { data } = await userClient
      .from('audit_logs')
      .select('id')
      .eq('id', logs[0].id)
      .single();
    expect(data).not.toBeNull();
  });
});
