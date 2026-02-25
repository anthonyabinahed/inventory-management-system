import { vi, describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  createTestUser,
  getAnonClient,
  getAdminClient,
  cleanupAll,
} from '../helpers/supabase.js';

// ============ Mocks (only Next.js framework) ============

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

let currentClient;

vi.mock('@/libs/supabase/server', () => ({
  createSupabaseClient: vi.fn(async () => currentClient),
}));

const {
  createReagent,
  updateReagent,
  deleteReagent,
  getReagents,
  getReagentById,
  stockIn,
  stockOut,
  deleteLot,
  getLotsForReagent,
  getReagentStockHistory,
  getLowStockReagents,
  getExpiredLotsCount,
  getExpiredLots,
  getFilterOptions,
  checkLotExists,
} = await import('@/actions/inventory');

let userClient, user;

beforeAll(async () => {
  await cleanupAll();

  ({ user, client: userClient } = await createTestUser({
    email: 'inv-action-user@test.com',
    password: 'UserPass123!',
    role: 'user',
    fullName: 'Inventory User',
  }));
});

beforeEach(() => {
  vi.clearAllMocks();
  currentClient = userClient;
});

afterAll(async () => {
  await cleanupAll();
});

// ============ createReagent ============

describe('createReagent', () => {
  const validData = {
    name: 'Test Reagent Create',
    reference: 'REF-CREATE-001',
    supplier: 'Test Supplier',
    category: 'reagent',
    minimum_stock: 5,
    unit: 'vials',
    storage_location: 'Fridge A',
    storage_temperature: '2-8°C',
    sector: 'Hematology',
  };

  it('creates reagent with valid data and total_quantity=0', async () => {
    const result = await createReagent(validData);
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('Test Reagent Create');
    expect(result.data.total_quantity).toBe(0);
    expect(result.data.created_by).toBe(user.id);
  });

  it('returns validation error for missing required fields', async () => {
    const result = await createReagent({ name: '' });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('returns unauthorized when client is anon', async () => {
    currentClient = getAnonClient();
    const result = await createReagent(validData);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });

  it('created reagent is retrievable via getReagentById', async () => {
    const createResult = await createReagent({
      ...validData,
      name: 'Retrievable Reagent',
      reference: `REF-RETRIEVE-${Date.now()}`,
    });
    expect(createResult.success).toBe(true);

    const getResult = await getReagentById(createResult.data.id);
    expect(getResult.success).toBe(true);
    expect(getResult.data.name).toBe('Retrievable Reagent');
  });
});

// ============ updateReagent ============

describe('updateReagent', () => {
  let reagentId;

  beforeAll(async () => {
    currentClient = userClient;
    const result = await createReagent({
      name: 'Update Target',
      reference: `REF-UPDATE-${Date.now()}`,
      supplier: 'Supplier',
      storage_location: 'Room B',
      storage_temperature: '15-25°C',
      sector: 'Chemistry',
    });
    reagentId = result.data.id;
  });

  it('updates reagent name', async () => {
    const result = await updateReagent(reagentId, { name: 'Updated Name' });
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('Updated Name');
  });

  it('partial update only changes provided fields', async () => {
    const before = await getReagentById(reagentId);
    await updateReagent(reagentId, { name: 'Partially Updated' });
    const after = await getReagentById(reagentId);

    expect(after.data.name).toBe('Partially Updated');
    expect(after.data.supplier).toBe(before.data.supplier);
    expect(after.data.sector).toBe(before.data.sector);
  });

  it('returns validation error for invalid field', async () => {
    const result = await updateReagent(reagentId, { minimum_stock: -1 });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });
});

// ============ deleteReagent ============

describe('deleteReagent', () => {
  it('soft-deletes reagent and its lots', async () => {
    // Create a reagent with a lot
    const reagent = await createReagent({
      name: 'Delete Target',
      reference: `REF-DEL-${Date.now()}`,
      supplier: 'Supplier',
      storage_location: 'Room C',
      storage_temperature: '2-8°C',
      sector: 'Serology',
    });

    await stockIn({
      reagent_id: reagent.data.id,
      lot_number: 'DEL-LOT-001',
      quantity: 10,
    });

    // Delete reagent
    const result = await deleteReagent(reagent.data.id);
    expect(result.success).toBe(true);

    // Verify soft deleted (use admin to bypass RLS filtering)
    const admin = getAdminClient();
    const { data: deletedReagent } = await admin
      .from('reagents')
      .select('is_active')
      .eq('id', reagent.data.id)
      .single();
    expect(deletedReagent.is_active).toBe(false);

    // Verify lots also soft deleted
    const { data: lots } = await admin
      .from('lots')
      .select('is_active')
      .eq('reagent_id', reagent.data.id);
    expect(lots.every(l => l.is_active === false)).toBe(true);
  });
});

// ============ getReagents ============

describe('getReagents', () => {
  let searchReagentId;

  beforeAll(async () => {
    currentClient = userClient;
    // Create reagents with distinct attributes for filtering
    const r1 = await createReagent({
      name: 'Hemoglobin Reagent',
      reference: `REF-SEARCH-${Date.now()}-A`,
      supplier: 'BioMerieux',
      category: 'reagent',
      minimum_stock: 100,
      total_quantity: 5,
      storage_location: 'Fridge A',
      storage_temperature: '2-8°C',
      sector: 'Hematology',
    });
    searchReagentId = r1.data.id;

    await createReagent({
      name: 'Control Solution',
      reference: `REF-SEARCH-${Date.now()}-B`,
      supplier: 'Beckman',
      category: 'control',
      storage_location: 'Fridge B',
      storage_temperature: '15-25°C',
      sector: 'Chemistry',
    });
  });

  it('returns paginated list', async () => {
    const result = await getReagents({ page: 1, limit: 25 });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.pagination).toBeDefined();
    expect(result.pagination.page).toBe(1);
  });

  it('filters by category', async () => {
    const result = await getReagents({ filters: { category: 'control' } });
    expect(result.success).toBe(true);
    expect(result.data.every(r => r.category === 'control')).toBe(true);
  });

  it('filters by search (name match)', async () => {
    const result = await getReagents({ filters: { search: 'Hemoglobin' } });
    expect(result.success).toBe(true);
    expect(result.data.some(r => r.name === 'Hemoglobin Reagent')).toBe(true);
  });

  it('lowStock filter returns reagents where total_quantity <= minimum_stock', async () => {
    // Update the search reagent to have low stock
    const admin = getAdminClient();
    await admin.from('reagents').update({ total_quantity: 5, minimum_stock: 100 }).eq('id', searchReagentId);

    const result = await getReagents({ filters: { lowStock: true } });
    expect(result.success).toBe(true);
    expect(result.data.every(r => r.total_quantity <= r.minimum_stock)).toBe(true);
  });

  it('search handles PostgREST special characters without error', async () => {
    // Parentheses, commas, and backslashes are PostgREST syntax characters in .or()
    const result = await getReagents({ filters: { search: 'Reagent (test)' } });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('returns empty for no matches', async () => {
    const result = await getReagents({ filters: { search: 'NONEXISTENT_REAGENT_XYZ' } });
    expect(result.success).toBe(true);
    expect(result.data.length).toBe(0);
  });
});

// ============ getReagentById ============

describe('getReagentById', () => {
  it('returns reagent data for valid ID', async () => {
    const created = await createReagent({
      name: 'GetById Target',
      reference: `REF-GETBYID-${Date.now()}`,
      supplier: 'Supplier',
      storage_location: 'Room D',
      storage_temperature: '2-8°C',
      sector: 'Immunology',
    });

    const result = await getReagentById(created.data.id);
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('GetById Target');
  });

  it('returns error for non-existent ID', async () => {
    const result = await getReagentById('00000000-0000-0000-0000-000000000000');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });
});

// ============ stockIn — new lot ============

describe('stockIn — new lot', () => {
  let reagentId;

  beforeAll(async () => {
    currentClient = userClient;
    const r = await createReagent({
      name: 'StockIn Target',
      reference: `REF-STOCKIN-${Date.now()}`,
      supplier: 'Supplier',
      storage_location: 'Room E',
      storage_temperature: '2-8°C',
      sector: 'Hematology',
    });
    reagentId = r.data.id;
  });

  it('creates new lot, logs movement, and recalculates total_quantity', async () => {
    const result = await stockIn({
      reagent_id: reagentId,
      lot_number: `NEWLOT-${Date.now()}`,
      quantity: 20,
      expiry_date: '2027-12-31',
      notes: 'Initial delivery',
    });

    expect(result.success).toBe(true);
    expect(result.data.quantity).toBe(20);
    expect(result.action).toBe('created');

    // Verify total_quantity was recalculated
    const reagent = await getReagentById(reagentId);
    expect(reagent.data.total_quantity).toBe(20);

    // Verify stock movement was logged
    const history = await getReagentStockHistory(reagentId);
    expect(history.data.length).toBeGreaterThanOrEqual(1);
    const movement = history.data.find(m => m.quantity_after === 20 && m.movement_type === 'in');
    expect(movement).toBeDefined();
  });

  it('returns validation error for missing lot_number', async () => {
    const result = await stockIn({
      reagent_id: reagentId,
      lot_number: '',
      quantity: 10,
    });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('returns unauthorized when anon', async () => {
    currentClient = getAnonClient();
    const result = await stockIn({
      reagent_id: reagentId,
      lot_number: 'ANON-LOT',
      quantity: 10,
    });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });
});

// ============ stockIn — existing lot ============

describe('stockIn — existing lot', () => {
  let reagentId;
  const lotNumber = `EXISTING-LOT-${Date.now()}`;

  beforeAll(async () => {
    currentClient = userClient;
    const r = await createReagent({
      name: 'StockIn Existing Target',
      reference: `REF-STOCKIN-EX-${Date.now()}`,
      supplier: 'Supplier',
      storage_location: 'Room F',
      storage_temperature: '2-8°C',
      sector: 'Chemistry',
    });
    reagentId = r.data.id;

    // Create initial lot
    await stockIn({
      reagent_id: reagentId,
      lot_number: lotNumber,
      quantity: 10,
      expiry_date: '2027-06-30',
    });
  });

  it('adds to existing lot quantity without duplicating', async () => {
    const result = await stockIn({
      reagent_id: reagentId,
      lot_number: lotNumber,
      quantity: 15,
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe('updated');
    expect(result.data.quantity).toBe(25); // 10 + 15

    // Should only have one lot with this number
    const lots = await getLotsForReagent(reagentId);
    const matchingLots = lots.data.filter(l => l.lot_number === lotNumber);
    expect(matchingLots.length).toBe(1);
  });

  it('logs movement with correct before/after', async () => {
    const history = await getReagentStockHistory(reagentId);
    const lastIn = history.data.find(m => m.movement_type === 'in' && m.quantity_before === 10);
    expect(lastIn).toBeDefined();
    expect(lastIn.quantity_after).toBe(25);
  });
});

// ============ stockOut ============

describe('stockOut', () => {
  let reagentId, lotId;

  beforeAll(async () => {
    currentClient = userClient;
    const r = await createReagent({
      name: 'StockOut Target',
      reference: `REF-STOCKOUT-${Date.now()}`,
      supplier: 'Supplier',
      storage_location: 'Room G',
      storage_temperature: '2-8°C',
      sector: 'Serology',
    });
    reagentId = r.data.id;

    const stockResult = await stockIn({
      reagent_id: reagentId,
      lot_number: `OUT-LOT-${Date.now()}`,
      quantity: 50,
    });
    lotId = stockResult.data.id;
  });

  it('decreases lot quantity, logs movement, recalculates total', async () => {
    const result = await stockOut(lotId, 10, { notes: 'Used for analysis' });
    expect(result.success).toBe(true);
    expect(result.newQuantity).toBe(40);

    // Verify total recalculated
    const reagent = await getReagentById(reagentId);
    expect(reagent.data.total_quantity).toBe(40);
  });

  it('returns error when quantity exceeds lot stock', async () => {
    const result = await stockOut(lotId, 9999);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('Insufficient stock');
  });

  it('returns validation error for zero quantity', async () => {
    const result = await stockOut(lotId, 0);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('accepts 3-arg signature with notes', async () => {
    const result = await stockOut(lotId, 5, { notes: 'Testing 3-arg' });
    expect(result.success).toBe(true);
    expect(result.newQuantity).toBe(35); // 40 - 5
  });
});

// ============ deleteLot ============

describe('deleteLot', () => {
  it('soft-deletes lot and recalculates total_quantity', async () => {
    const r = await createReagent({
      name: 'DeleteLot Target',
      reference: `REF-DELLOT-${Date.now()}`,
      supplier: 'Supplier',
      storage_location: 'Room H',
      storage_temperature: '2-8°C',
      sector: 'Hematology',
    });

    const lot = await stockIn({
      reagent_id: r.data.id,
      lot_number: `DEL-LOT-${Date.now()}`,
      quantity: 30,
    });

    const result = await deleteLot(lot.data.id);
    expect(result.success).toBe(true);

    // Verify total_quantity is 0 after deleting the only lot
    const reagent = await getReagentById(r.data.id);
    expect(reagent.data.total_quantity).toBe(0);
  });

  it('returns error for non-existent lot', async () => {
    const result = await deleteLot('00000000-0000-0000-0000-000000000000');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });
});

// ============ getLotsForReagent ============

describe('getLotsForReagent', () => {
  let reagentId;

  beforeAll(async () => {
    currentClient = userClient;
    const r = await createReagent({
      name: 'GetLots Target',
      reference: `REF-GETLOTS-${Date.now()}`,
      supplier: 'Supplier',
      storage_location: 'Room I',
      storage_temperature: '2-8°C',
      sector: 'Chemistry',
    });
    reagentId = r.data.id;

    // Active lot with stock
    await stockIn({ reagent_id: reagentId, lot_number: `LOTS-A-${Date.now()}`, quantity: 10 });
    // Active lot with zero stock
    const zeroLot = await stockIn({ reagent_id: reagentId, lot_number: `LOTS-B-${Date.now()}`, quantity: 5 });
    await stockOut(zeroLot.data.id, 5);
    // Deleted lot
    const delLot = await stockIn({ reagent_id: reagentId, lot_number: `LOTS-C-${Date.now()}`, quantity: 8 });
    await deleteLot(delLot.data.id);
  });

  it('returns active lots for reagent', async () => {
    const result = await getLotsForReagent(reagentId);
    expect(result.success).toBe(true);
    expect(result.data.every(l => l.is_active === true)).toBe(true);
  });

  it('includeInactive: true includes soft-deleted lots', async () => {
    const result = await getLotsForReagent(reagentId, { includeInactive: true });
    expect(result.success).toBe(true);
    expect(result.data.some(l => l.is_active === false)).toBe(true);
  });

  it('hideOutOfStock: true excludes zero-quantity lots', async () => {
    const result = await getLotsForReagent(reagentId, { hideOutOfStock: true });
    expect(result.success).toBe(true);
    expect(result.data.every(l => l.quantity > 0)).toBe(true);
  });
});

// ============ getReagentStockHistory ============

describe('getReagentStockHistory', () => {
  it('returns movements for a reagent', async () => {
    const r = await createReagent({
      name: 'History Target',
      reference: `REF-HISTORY-${Date.now()}`,
      supplier: 'Supplier',
      storage_location: 'Room J',
      storage_temperature: '2-8°C',
      sector: 'Serology',
    });

    const lot = await stockIn({
      reagent_id: r.data.id,
      lot_number: `HIST-LOT-${Date.now()}`,
      quantity: 20,
    });
    await stockOut(lot.data.id, 5);

    const result = await getReagentStockHistory(r.data.id);
    expect(result.success).toBe(true);
    expect(result.data.length).toBeGreaterThanOrEqual(2); // in + out
    expect(result.data.some(m => m.movement_type === 'in')).toBe(true);
    expect(result.data.some(m => m.movement_type === 'out')).toBe(true);
  });

  it('returns empty array for reagent with no movements', async () => {
    const r = await createReagent({
      name: 'No History',
      reference: `REF-NOHIST-${Date.now()}`,
      supplier: 'Supplier',
      storage_location: 'Room K',
      storage_temperature: '2-8°C',
      sector: 'Immunology',
    });

    const result = await getReagentStockHistory(r.data.id);
    expect(result.success).toBe(true);
    expect(result.data.length).toBe(0);
  });
});

// ============ getLowStockReagents ============

describe('getLowStockReagents', () => {
  it('returns reagents where total_quantity <= minimum_stock', async () => {
    // Create a low-stock reagent
    const r = await createReagent({
      name: 'Low Stock Reagent',
      reference: `REF-LOW-${Date.now()}`,
      supplier: 'Supplier',
      minimum_stock: 50,
      storage_location: 'Room L',
      storage_temperature: '2-8°C',
      sector: 'Hematology',
    });
    // total_quantity is 0, minimum_stock is 50 — definitely low stock

    const result = await getLowStockReagents();
    expect(result.success).toBe(true);
    expect(result.data.some(item => item.id === r.data.id)).toBe(true);
  });
});

// ============ getExpiredLotsCount ============

describe('getExpiredLotsCount', () => {
  it('returns count of unique reagents with expired lots', async () => {
    const r = await createReagent({
      name: 'Expired Lot Reagent',
      reference: `REF-EXPIRED-${Date.now()}`,
      supplier: 'Supplier',
      storage_location: 'Room M',
      storage_temperature: '2-8°C',
      sector: 'Serology',
    });

    // Create an expired lot via direct insert (past date)
    await stockIn({
      reagent_id: r.data.id,
      lot_number: `EXP-LOT-${Date.now()}`,
      quantity: 5,
      expiry_date: '2020-01-01',
    });

    const result = await getExpiredLotsCount();
    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(1);
  });
});

// ============ getExpiredLots ============

describe('getExpiredLots', () => {
  it('returns lots with reagent details for expired lots', async () => {
    const r = await createReagent({
      name: 'Expired Detail Reagent',
      reference: `REF-EXP-DET-${Date.now()}`,
      supplier: 'Supplier',
      storage_location: 'Fridge A',
      storage_temperature: '2-8°C',
      sector: 'Hematology',
    });

    await stockIn({
      reagent_id: r.data.id,
      lot_number: `EXP-DET-LOT-${Date.now()}`,
      quantity: 5,
      expiry_date: '2020-01-01',
    });

    const result = await getExpiredLots();
    expect(result.success).toBe(true);
    expect(result.data.length).toBeGreaterThanOrEqual(1);

    const lot = result.data.find(l => l.reagent_id === r.data.id);
    expect(lot).toBeDefined();
    expect(lot.reagents).toBeDefined();
    expect(lot.reagents.name).toBe('Expired Detail Reagent');
  });

  it('includes lots expiring within 30 days', async () => {
    const r = await createReagent({
      name: 'Soon Expiring Reagent',
      reference: `REF-SOON-${Date.now()}`,
      supplier: 'Supplier',
      storage_location: 'Fridge A',
      storage_temperature: '2-8°C',
      sector: 'Hematology',
    });

    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 15);
    const soonDateStr = soonDate.toISOString().split('T')[0];

    await stockIn({
      reagent_id: r.data.id,
      lot_number: `SOON-LOT-${Date.now()}`,
      quantity: 3,
      expiry_date: soonDateStr,
    });

    const result = await getExpiredLots();
    expect(result.success).toBe(true);
    const lot = result.data.find(l => l.reagent_id === r.data.id);
    expect(lot).toBeDefined();
  });

  it('excludes lots expiring beyond 30 days', async () => {
    const r = await createReagent({
      name: 'Far Future Reagent',
      reference: `REF-FAR-${Date.now()}`,
      supplier: 'Supplier',
      storage_location: 'Fridge A',
      storage_temperature: '2-8°C',
      sector: 'Hematology',
    });

    await stockIn({
      reagent_id: r.data.id,
      lot_number: `FAR-LOT-${Date.now()}`,
      quantity: 10,
      expiry_date: '2030-12-31',
    });

    const result = await getExpiredLots();
    expect(result.success).toBe(true);
    const lot = result.data.find(l => l.reagent_id === r.data.id);
    expect(lot).toBeUndefined();
  });

  it('returns lots ordered by expiry_date ascending', async () => {
    const result = await getExpiredLots();
    expect(result.success).toBe(true);
    if (result.data.length >= 2) {
      for (let i = 1; i < result.data.length; i++) {
        expect(new Date(result.data[i].expiry_date).getTime())
          .toBeGreaterThanOrEqual(new Date(result.data[i - 1].expiry_date).getTime());
      }
    }
  });
});

// ============ getFilterOptions ============

describe('getFilterOptions', () => {
  it('returns unique sorted values for filter dropdowns', async () => {
    const result = await getFilterOptions();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data.suppliers)).toBe(true);
    expect(Array.isArray(result.data.locations)).toBe(true);
    expect(Array.isArray(result.data.sectors)).toBe(true);
    expect(Array.isArray(result.data.machines)).toBe(true);
    expect(Array.isArray(result.data.categories)).toBe(true);
    // Should have some values from the reagents created in this suite
    expect(result.data.suppliers.length).toBeGreaterThanOrEqual(1);
  });
});

// ============ checkLotExists ============

describe('checkLotExists', () => {
  let reagentId;
  const lotNumber = `CHECK-LOT-${Date.now()}`;

  beforeAll(async () => {
    currentClient = userClient;
    const r = await createReagent({
      name: 'CheckLot Target',
      reference: `REF-CHECK-${Date.now()}`,
      supplier: 'Supplier',
      storage_location: 'Room N',
      storage_temperature: '2-8°C',
      sector: 'Chemistry',
    });
    reagentId = r.data.id;

    await stockIn({
      reagent_id: reagentId,
      lot_number: lotNumber,
      quantity: 10,
    });
  });

  it('returns exists: true for existing lot number', async () => {
    const result = await checkLotExists(reagentId, lotNumber);
    expect(result.success).toBe(true);
    expect(result.exists).toBe(true);
    expect(result.lot).toBeDefined();
    expect(result.lot.quantity).toBe(10);
  });

  it('returns exists: false for non-existent lot number', async () => {
    const result = await checkLotExists(reagentId, 'NONEXISTENT-LOT');
    expect(result.success).toBe(true);
    expect(result.exists).toBe(false);
  });
});
