import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestUser,
  createTestReagent,
  createTestLot,
  cleanupAll,
} from '../helpers/supabase.js';

let userClient, user;

beforeAll(async () => {
  await cleanupAll();
  ({ user, client: userClient } = await createTestUser({
    email: 'inventory-test@test.com',
    role: 'user',
  }));
});

afterAll(async () => {
  await cleanupAll();
});

// ============ Stock In ============

describe('stock in', () => {
  it('inserting a lot sets correct quantity', async () => {
    const reagent = await createTestReagent({
      created_by: user.id,
      updated_by: user.id,
    }, userClient);

    const { data, error } = await userClient
      .from('lots')
      .insert({
        reagent_id: reagent.id,
        lot_number: 'STOCK-IN-001',
        quantity: 25,
        expiry_date: '2027-06-30',
        date_of_reception: '2026-01-15',
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.quantity).toBe(25);
    expect(data.lot_number).toBe('STOCK-IN-001');
  });

  it('stock movement record created with type=in and correct before/after', async () => {
    const reagent = await createTestReagent({
      created_by: user.id,
      updated_by: user.id,
    }, userClient);
    const lot = await createTestLot(reagent.id, {
      lot_number: 'MOVEMENT-IN-001',
      quantity: 0,
      created_by: user.id,
      updated_by: user.id,
    }, userClient);

    // Insert a stock-in movement
    const { data, error } = await userClient
      .from('stock_movements')
      .insert({
        lot_id: lot.id,
        movement_type: 'in',
        quantity: 15,
        quantity_before: 0,
        quantity_after: 15,
        performed_by: user.id,
        notes: 'Initial stock in',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.movement_type).toBe('in');
    expect(data.quantity_before).toBe(0);
    expect(data.quantity_after).toBe(15);
    expect(data.performed_by).toBe(user.id);
  });
});

// ============ Stock Out ============

describe('stock out', () => {
  it('decreasing lot quantity works', async () => {
    const reagent = await createTestReagent({
      created_by: user.id,
      updated_by: user.id,
    }, userClient);
    const lot = await createTestLot(reagent.id, {
      quantity: 20,
      created_by: user.id,
      updated_by: user.id,
    }, userClient);

    // Decrease quantity
    const { error } = await userClient
      .from('lots')
      .update({ quantity: 15, updated_by: user.id })
      .eq('id', lot.id);
    expect(error).toBeNull();

    // Verify
    const { data } = await userClient
      .from('lots')
      .select('quantity')
      .eq('id', lot.id)
      .single();
    expect(data.quantity).toBe(15);
  });

  it('stock movement record created with type=out and correct before/after', async () => {
    const reagent = await createTestReagent({
      created_by: user.id,
      updated_by: user.id,
    }, userClient);
    const lot = await createTestLot(reagent.id, {
      quantity: 30,
      created_by: user.id,
      updated_by: user.id,
    }, userClient);

    const { data, error } = await userClient
      .from('stock_movements')
      .insert({
        lot_id: lot.id,
        movement_type: 'out',
        quantity: -5,
        quantity_before: 30,
        quantity_after: 25,
        performed_by: user.id,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.movement_type).toBe('out');
    expect(data.quantity_before).toBe(30);
    expect(data.quantity_after).toBe(25);
  });

  it('quantity cannot go below 0 (check constraint)', async () => {
    const reagent = await createTestReagent({
      created_by: user.id,
      updated_by: user.id,
    }, userClient);
    const lot = await createTestLot(reagent.id, {
      quantity: 5,
      created_by: user.id,
      updated_by: user.id,
    }, userClient);

    const { error } = await userClient
      .from('lots')
      .update({ quantity: -1 })
      .eq('id', lot.id);
    expect(error).not.toBeNull();
    expect(error.code).toBe('23514'); // check_violation
  });
});

// ============ Soft Delete ============

describe('soft delete', () => {
  it('setting is_active=false preserves the lot data', async () => {
    const reagent = await createTestReagent({
      created_by: user.id,
      updated_by: user.id,
    }, userClient);
    const lot = await createTestLot(reagent.id, {
      quantity: 10,
      created_by: user.id,
      updated_by: user.id,
    }, userClient);

    // Soft delete
    const { error } = await userClient
      .from('lots')
      .update({ is_active: false, updated_by: user.id })
      .eq('id', lot.id);
    expect(error).toBeNull();

    // Data still exists
    const { data } = await userClient
      .from('lots')
      .select('*')
      .eq('id', lot.id)
      .single();
    expect(data).not.toBeNull();
    expect(data.is_active).toBe(false);
    expect(data.quantity).toBe(10);
  });

  it('soft-deleted lot still has stock movement history', async () => {
    const reagent = await createTestReagent({
      created_by: user.id,
      updated_by: user.id,
    }, userClient);
    const lot = await createTestLot(reagent.id, {
      quantity: 10,
      created_by: user.id,
      updated_by: user.id,
    }, userClient);

    // Add a movement
    await userClient.from('stock_movements').insert({
      lot_id: lot.id,
      movement_type: 'in',
      quantity: 10,
      quantity_before: 0,
      quantity_after: 10,
      performed_by: user.id,
    });

    // Soft delete the lot
    await userClient
      .from('lots')
      .update({ is_active: false })
      .eq('id', lot.id);

    // Movement history preserved
    const { data: movements } = await userClient
      .from('stock_movements')
      .select('*')
      .eq('lot_id', lot.id);
    expect(movements.length).toBeGreaterThanOrEqual(1);
  });
});

// ============ Aggregate Calculation ============

describe('aggregation', () => {
  it('reagent total_quantity can be recalculated from active lots', async () => {
    const reagent = await createTestReagent({
      total_quantity: 0,
      created_by: user.id,
      updated_by: user.id,
    }, userClient);

    // Create multiple lots
    await createTestLot(reagent.id, {
      lot_number: `AGG-1-${Date.now()}`,
      quantity: 10,
      created_by: user.id,
      updated_by: user.id,
    }, userClient);
    await createTestLot(reagent.id, {
      lot_number: `AGG-2-${Date.now()}`,
      quantity: 15,
      created_by: user.id,
      updated_by: user.id,
    }, userClient);
    // Inactive lot — should NOT count
    await createTestLot(reagent.id, {
      lot_number: `AGG-3-${Date.now()}`,
      quantity: 100,
      is_active: false,
      created_by: user.id,
      updated_by: user.id,
    }, userClient);

    // Calculate total from active lots
    const { data: lots } = await userClient
      .from('lots')
      .select('quantity')
      .eq('reagent_id', reagent.id)
      .eq('is_active', true);

    const total = lots.reduce((sum, l) => sum + l.quantity, 0);
    expect(total).toBe(25); 

    // Update reagent
    await userClient
      .from('reagents')
      .update({ total_quantity: total, updated_by: user.id })
      .eq('id', reagent.id);

    const { data: updated } = await userClient
      .from('reagents')
      .select('total_quantity')
      .eq('id', reagent.id)
      .single();
    expect(updated.total_quantity).toBe(25);
  });
});

// ============ Alerts ============

describe('alerts', () => {
  it('low stock is detectable (total_quantity <= minimum_stock)', async () => {
    const lowStockReagent = await createTestReagent({
      minimum_stock: 10,
      total_quantity: 3,
      created_by: user.id,
      updated_by: user.id,
    }, userClient);

    const { data } = await userClient
      .from('reagents')
      .select('*')
      .eq('is_active', true)
      .eq('id', lowStockReagent.id)
      .single();

    expect(data.total_quantity).toBeLessThanOrEqual(data.minimum_stock);
  });

  it('expired lots are detectable', async () => {
    const reagent = await createTestReagent({
      created_by: user.id,
      updated_by: user.id,
    }, userClient);

    // Create an expired lot
    await createTestLot(reagent.id, {
      lot_number: `EXPIRED-${Date.now()}`,
      quantity: 5,
      expiry_date: '2024-01-01', // Past date
      created_by: user.id,
      updated_by: user.id,
    }, userClient);

    const today = new Date().toISOString().split('T')[0];
    const { data: expiredLots } = await userClient
      .from('lots')
      .select('*')
      .eq('reagent_id', reagent.id)
      .eq('is_active', true)
      .gt('quantity', 0)
      .lt('expiry_date', today);

    expect(expiredLots.length).toBeGreaterThanOrEqual(1);
  });
});
