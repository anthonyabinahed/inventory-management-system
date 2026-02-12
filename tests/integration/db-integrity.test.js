import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getAdminClient,
  createTestUser,
  createTestReagent,
  createTestLot,
  cleanupAll,
} from '../helpers/supabase.js';

let admin;
let user;

beforeAll(async () => {
  await cleanupAll();
  admin = getAdminClient();
  ({ user } = await createTestUser({ email: 'db-integrity@test.com', role: 'user' }));
});

afterAll(async () => {
  await cleanupAll();
});

// ============ Unique constraints ============

describe('unique constraints', () => {
  it('duplicate reagent reference is rejected', async () => {
    const ref = `UNIQUE-REF-${Date.now()}`;
    await createTestReagent({ reference: ref });

    const { error } = await admin.from('reagents').insert({
      name: 'Duplicate',
      reference: ref,
      supplier: 'Test',
      category: 'reagent',
      storage_location: 'Room A',
      storage_temperature: '2-8°C',
      sector: 'Serology',
      unit: 'vials',
    });
    expect(error).not.toBeNull();
    expect(error.code).toBe('23505'); // unique_violation
  });

  it('duplicate lot_number for same reagent is rejected', async () => {
    const reagent = await createTestReagent();
    await createTestLot(reagent.id, { lot_number: 'DUP-LOT-001' });

    const { error } = await admin.from('lots').insert({
      reagent_id: reagent.id,
      lot_number: 'DUP-LOT-001',
      quantity: 5,
      expiry_date: '2027-01-01',
      date_of_reception: '2026-01-01',
    });
    expect(error).not.toBeNull();
    expect(error.code).toBe('23505');
  });

  it('same lot_number for different reagents is allowed', async () => {
    const reagentA = await createTestReagent();
    const reagentB = await createTestReagent();
    const sharedLotNumber = `SHARED-${Date.now()}`;

    await createTestLot(reagentA.id, { lot_number: sharedLotNumber });

    const { error } = await admin.from('lots').insert({
      reagent_id: reagentB.id,
      lot_number: sharedLotNumber,
      quantity: 3,
      expiry_date: '2027-06-01',
      date_of_reception: '2026-02-01',
    });
    expect(error).toBeNull();
  });
});

// ============ Check constraints ============

describe('check constraints', () => {
  it('negative lot quantity is rejected', async () => {
    const reagent = await createTestReagent();

    const { error } = await admin.from('lots').insert({
      reagent_id: reagent.id,
      lot_number: `NEG-QTY-${Date.now()}`,
      quantity: -1,
      expiry_date: '2027-01-01',
      date_of_reception: '2026-01-01',
    });
    expect(error).not.toBeNull();
    expect(error.code).toBe('23514'); // check_violation
  });

  it('negative reagent minimum_stock is rejected', async () => {
    const { error } = await admin.from('reagents').insert({
      name: 'Neg Min Stock',
      reference: `NEG-MIN-${Date.now()}`,
      supplier: 'Test',
      category: 'reagent',
      storage_location: 'Room A',
      storage_temperature: '2-8°C',
      sector: 'Serology',
      unit: 'vials',
      minimum_stock: -1,
    });
    expect(error).not.toBeNull();
  });

  it('invalid reagent category is rejected', async () => {
    const { error } = await admin.from('reagents').insert({
      name: 'Bad Category',
      reference: `BAD-CAT-${Date.now()}`,
      supplier: 'Test',
      category: 'invalid_category',
      storage_location: 'Room A',
      storage_temperature: '2-8°C',
      sector: 'Serology',
      unit: 'vials',
    });
    expect(error).not.toBeNull();
  });

  it('invalid movement_type is rejected', async () => {
    const reagent = await createTestReagent();
    const lot = await createTestLot(reagent.id);

    const { error } = await admin.from('stock_movements').insert({
      lot_id: lot.id,
      movement_type: 'invalid_type',
      quantity: 1,
      quantity_before: 0,
      quantity_after: 1,
      performed_by: user.id,
    });
    expect(error).not.toBeNull();
  });

  it('invalid profile role is rejected', async () => {
    const { error } = await admin
      .from('profiles')
      .update({ role: 'superadmin' })
      .eq('id', user.id);
    expect(error).not.toBeNull();
  });
});

// ============ Foreign key behavior ============

describe('foreign key behavior', () => {
  it('deleting a reagent cascades to its lots', async () => {
    const reagent = await createTestReagent();
    const lot = await createTestLot(reagent.id);

    // Hard delete the reagent (via admin, bypasses RLS)
    await admin.from('reagents').delete().eq('id', reagent.id);

    // Lot should be gone (CASCADE)
    const { data } = await admin
      .from('lots')
      .select('id')
      .eq('id', lot.id)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it('deleting a lot sets stock_movement.lot_id to NULL', async () => {
    const reagent = await createTestReagent();
    const lot = await createTestLot(reagent.id);

    // Insert a movement for this lot
    const { data: movement } = await admin
      .from('stock_movements')
      .insert({
        lot_id: lot.id,
        movement_type: 'in',
        quantity: 10,
        quantity_before: 0,
        quantity_after: 10,
        performed_by: user.id,
      })
      .select()
      .single();

    // Delete the lot
    await admin.from('lots').delete().eq('id', lot.id);

    // Movement should still exist but with lot_id = NULL (SET NULL)
    const { data: updatedMovement } = await admin
      .from('stock_movements')
      .select('lot_id')
      .eq('id', movement.id)
      .single();
    expect(updatedMovement.lot_id).toBeNull();
  });

  it('deleting a user cascades to their profile', async () => {
    const { user: tempUser } = await createTestUser({
      email: 'cascade-delete@test.com',
      role: 'user',
    });

    // Delete auth user
    await admin.auth.admin.deleteUser(tempUser.id);

    // Profile should be gone (CASCADE)
    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('id', tempUser.id)
      .maybeSingle();
    expect(data).toBeNull();
  });
});

// ============ Triggers ============

describe('triggers', () => {
  it('updated_at auto-updates on profile change', async () => {
    const { data: before } = await admin
      .from('profiles')
      .select('updated_at')
      .eq('id', user.id)
      .single();

    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 100));

    await admin
      .from('profiles')
      .update({ full_name: 'Trigger Updated' })
      .eq('id', user.id);

    const { data: after } = await admin
      .from('profiles')
      .select('updated_at')
      .eq('id', user.id)
      .single();

    expect(new Date(after.updated_at).getTime()).toBeGreaterThan(
      new Date(before.updated_at).getTime()
    );
  });

  it('updated_at auto-updates on reagent change', async () => {
    const reagent = await createTestReagent();

    const { data: before } = await admin
      .from('reagents')
      .select('updated_at')
      .eq('id', reagent.id)
      .single();

    await new Promise((r) => setTimeout(r, 100));

    await admin
      .from('reagents')
      .update({ name: 'Trigger Updated Reagent' })
      .eq('id', reagent.id);

    const { data: after } = await admin
      .from('reagents')
      .select('updated_at')
      .eq('id', reagent.id)
      .single();

    expect(new Date(after.updated_at).getTime()).toBeGreaterThan(
      new Date(before.updated_at).getTime()
    );
  });

  it('updated_at auto-updates on lot change', async () => {
    const reagent = await createTestReagent();
    const lot = await createTestLot(reagent.id);

    const { data: before } = await admin
      .from('lots')
      .select('updated_at')
      .eq('id', lot.id)
      .single();

    await new Promise((r) => setTimeout(r, 100));

    await admin.from('lots').update({ quantity: 99 }).eq('id', lot.id);

    const { data: after } = await admin
      .from('lots')
      .select('updated_at')
      .eq('id', lot.id)
      .single();

    expect(new Date(after.updated_at).getTime()).toBeGreaterThan(
      new Date(before.updated_at).getTime()
    );
  });
});

// ============ Nullable expiry_date ============

describe('nullable expiry_date', () => {
  it('lot with NULL expiry_date is allowed', async () => {
    const reagent = await createTestReagent({ category: 'consumable' });

    const { data, error } = await admin
      .from('lots')
      .insert({
        reagent_id: reagent.id,
        lot_number: `NULL-EXP-${Date.now()}`,
        quantity: 50,
        expiry_date: null,
        date_of_reception: '2026-01-01',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.expiry_date).toBeNull();
  });

  it('shelf_life_days is NULL when expiry_date is NULL', async () => {
    const reagent = await createTestReagent({ category: 'consumable' });

    const { data } = await admin
      .from('lots')
      .insert({
        reagent_id: reagent.id,
        lot_number: `NULL-SHELF-${Date.now()}`,
        quantity: 25,
        expiry_date: null,
        date_of_reception: '2026-01-01',
      })
      .select('shelf_life_days')
      .single();

    expect(data.shelf_life_days).toBeNull();
  });
});
