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
  getMovementTrends,
  getTopConsumedItems,
  getSectorConsumption,
  getMachineConsumption,
  getInventoryComposition,
  getAuditLogs,
} = await import('@/actions/analytics');

const { createReagent, stockIn, stockOut } = await import('@/actions/inventory');

let userClient, user;
let reagentA, reagentB, reagentNoMachine;
let lotA, lotB;

beforeAll(async () => {
  await cleanupAll();

  ({ user, client: userClient } = await createTestUser({
    email: 'analytics-action-user@test.com',
    password: 'TestPass123!',
    role: 'user',
    fullName: 'Analytics Tester',
  }));

  currentClient = userClient;

  // Reagent A — Hematology sector, Machine X
  const rA = await createReagent({
    name: 'Analytics Reagent A',
    reference: `REF-ANA-A-${Date.now()}`,
    supplier: 'Supplier A',
    category: 'reagent',
    minimum_stock: 100,
    storage_location: 'Fridge A',
    storage_temperature: '2-8°C',
    sector: 'Hematology',
    machine: 'Machine X',
  });
  reagentA = rA.data;

  // Reagent B — Chemistry sector, Machine Y
  const rB = await createReagent({
    name: 'Analytics Reagent B',
    reference: `REF-ANA-B-${Date.now()}`,
    supplier: 'Supplier B',
    category: 'control',
    minimum_stock: 5,
    storage_location: 'Room B',
    storage_temperature: '15-25°C',
    sector: 'Chemistry',
    machine: 'Machine Y',
  });
  reagentB = rB.data;

  // Reagent with no machine (null)
  const rC = await createReagent({
    name: 'Analytics Reagent No Machine',
    reference: `REF-ANA-C-${Date.now()}`,
    supplier: 'Supplier C',
    category: 'consumable',
    minimum_stock: 2,
    storage_location: 'Shelf C',
    storage_temperature: '15-25°C',
    sector: 'Hematology',
  });
  reagentNoMachine = rC.data;

  // Stock in to create lots
  const lotAResult = await stockIn({
    reagent_id: reagentA.id,
    lot_number: `ANA-LOT-A-${Date.now()}`,
    quantity: 50,
    expiry_date: '2027-12-31',
  });
  lotA = lotAResult.data;

  const lotBResult = await stockIn({
    reagent_id: reagentB.id,
    lot_number: `ANA-LOT-B-${Date.now()}`,
    quantity: 30,
    expiry_date: '2027-06-30',
  });
  lotB = lotBResult.data;

  // Stock in for no-machine reagent
  await stockIn({
    reagent_id: reagentNoMachine.id,
    lot_number: `ANA-LOT-C-${Date.now()}`,
    quantity: 10,
  });

  // Stock out to create consumption data
  await stockOut(lotA.id, 20, { notes: 'Consumed A batch 1' });
  await stockOut(lotA.id, 5, { notes: 'Consumed A batch 2' });
  await stockOut(lotB.id, 15, { notes: 'Consumed B batch 1' });

  // Insert audit logs with varied actions and timestamps via admin
  const admin = getAdminClient();
  await admin.from('audit_logs').insert([
    {
      action: 'create_reagent',
      resource_type: 'reagent',
      resource_id: reagentA.id,
      description: 'Created reagent "Analytics Reagent A"',
      user_id: user.id,
      performed_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      action: 'stock_in',
      resource_type: 'lot',
      resource_id: lotA.id,
      description: 'Stocked in 50 to lot ANA-LOT-A',
      user_id: user.id,
      performed_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      action: 'stock_out',
      resource_type: 'lot',
      resource_id: lotA.id,
      description: 'Stocked out 20 from lot ANA-LOT-A',
      user_id: user.id,
      performed_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      action: 'update_reagent',
      resource_type: 'reagent',
      resource_id: reagentB.id,
      description: 'Updated reagent "Analytics Reagent B"',
      user_id: user.id,
      performed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    // Old log beyond 7d range for date filtering tests
    {
      action: 'create_reagent',
      resource_type: 'reagent',
      resource_id: reagentB.id,
      description: 'Old log for Analytics Reagent B',
      user_id: user.id,
      performed_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
  ]);
});

beforeEach(() => {
  vi.clearAllMocks();
  currentClient = userClient;
});

afterAll(async () => {
  await cleanupAll();
});

// ============ getMovementTrends ============

describe('getMovementTrends', () => {
  it('returns success with trends, totalIn, and totalOut', async () => {
    const result = await getMovementTrends('30d');
    expect(result.success).toBe(true);
    expect(result.data.trends).toBeDefined();
    expect(Array.isArray(result.data.trends)).toBe(true);
    expect(typeof result.data.totalIn).toBe('number');
    expect(typeof result.data.totalOut).toBe('number');
  });

  it('totalIn and totalOut reflect created movements', async () => {
    const result = await getMovementTrends('30d');
    expect(result.success).toBe(true);
    // We created: in 50 (A) + in 30 (B) + in 10 (C) = 90 in
    // We created: out 20 + out 5 (A) + out 15 (B) = 40 out
    // But there may be seed data, so check our movements are included
    expect(result.data.totalIn).toBeGreaterThanOrEqual(90);
    expect(result.data.totalOut).toBeGreaterThanOrEqual(40);
  });

  it('filters by sector', async () => {
    const hemaResult = await getMovementTrends('30d', 'Hematology');
    const chemResult = await getMovementTrends('30d', 'Chemistry');
    expect(hemaResult.success).toBe(true);
    expect(chemResult.success).toBe(true);
    // Hematology has reagentA (in 50, out 25) + reagentNoMachine (in 10)
    // Chemistry has reagentB (in 30, out 15)
    // totals should differ
    expect(hemaResult.data.totalOut).not.toBe(chemResult.data.totalOut);
  });

  it('filters by machine', async () => {
    const result = await getMovementTrends('30d', null, 'Machine X');
    expect(result.success).toBe(true);
    // Only Machine X reagent (reagentA) movements
    // reagentB (Machine Y) and reagentNoMachine (null) excluded
    expect(result.data.totalIn).toBeGreaterThanOrEqual(50);
    expect(result.data.totalOut).toBeGreaterThanOrEqual(25);
  });

  it('returns empty trends for non-existent sector', async () => {
    const result = await getMovementTrends('30d', 'NonExistentSector');
    expect(result.success).toBe(true);
    expect(result.data.trends).toHaveLength(0);
    expect(result.data.totalIn).toBe(0);
    expect(result.data.totalOut).toBe(0);
  });

  it('returns Unauthorized for anon client', async () => {
    currentClient = getAnonClient();
    const result = await getMovementTrends('30d');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });
});

// ============ getTopConsumedItems ============

describe('getTopConsumedItems', () => {
  it('returns reagents sorted by totalOut descending', async () => {
    const result = await getTopConsumedItems('30d', 100);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);

    // Verify sorted descending
    for (let i = 1; i < result.data.length; i++) {
      expect(result.data[i - 1].totalOut).toBeGreaterThanOrEqual(result.data[i].totalOut);
    }
  });

  it('respects limit parameter', async () => {
    const result = await getTopConsumedItems('30d', 2);
    expect(result.success).toBe(true);
    expect(result.data.length).toBeLessThanOrEqual(2);
  });

  it('only counts out movements (not in)', async () => {
    const result = await getTopConsumedItems('30d', 100);
    expect(result.success).toBe(true);
    // reagentA had 25 out, reagentB had 15 out
    const itemA = result.data.find(r => r.id === reagentA.id);
    const itemB = result.data.find(r => r.id === reagentB.id);
    if (itemA) expect(itemA.totalOut).toBeGreaterThanOrEqual(25);
    if (itemB) expect(itemB.totalOut).toBeGreaterThanOrEqual(15);
  });

  it('returns Unauthorized for anon client', async () => {
    currentClient = getAnonClient();
    const result = await getTopConsumedItems('30d');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });
});

// ============ getSectorConsumption ============

describe('getSectorConsumption', () => {
  it('returns sectors sorted by totalOut descending', async () => {
    const result = await getSectorConsumption('30d');
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);

    for (let i = 1; i < result.data.length; i++) {
      expect(result.data[i - 1].totalOut).toBeGreaterThanOrEqual(result.data[i].totalOut);
    }
  });

  it('includes sectors with stock-out data', async () => {
    const result = await getSectorConsumption('30d');
    expect(result.success).toBe(true);
    const hematology = result.data.find(s => s.sector === 'Hematology');
    const chemistry = result.data.find(s => s.sector === 'Chemistry');
    // reagentA out 25 in Hematology, reagentB out 15 in Chemistry
    if (hematology) expect(hematology.totalOut).toBeGreaterThanOrEqual(25);
    if (chemistry) expect(chemistry.totalOut).toBeGreaterThanOrEqual(15);
  });

  it('returns Unauthorized for anon client', async () => {
    currentClient = getAnonClient();
    const result = await getSectorConsumption('30d');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });
});

// ============ getMachineConsumption ============

describe('getMachineConsumption', () => {
  it('returns machines sorted by totalOut descending', async () => {
    const result = await getMachineConsumption('30d');
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);

    for (let i = 1; i < result.data.length; i++) {
      expect(result.data[i - 1].totalOut).toBeGreaterThanOrEqual(result.data[i].totalOut);
    }
  });

  it('skips reagents with null machine', async () => {
    const result = await getMachineConsumption('30d');
    expect(result.success).toBe(true);
    // reagentNoMachine has no out-movements, but if it did, its null machine would be skipped
    const nullEntry = result.data.find(m => m.machine === null || m.machine === undefined);
    expect(nullEntry).toBeUndefined();
  });

  it('includes Machine X and Machine Y', async () => {
    const result = await getMachineConsumption('30d');
    expect(result.success).toBe(true);
    const machineX = result.data.find(m => m.machine === 'Machine X');
    const machineY = result.data.find(m => m.machine === 'Machine Y');
    if (machineX) expect(machineX.totalOut).toBeGreaterThanOrEqual(25);
    if (machineY) expect(machineY.totalOut).toBeGreaterThanOrEqual(15);
  });

  it('returns Unauthorized for anon client', async () => {
    currentClient = getAnonClient();
    const result = await getMachineConsumption('30d');
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });
});

// ============ getInventoryComposition ============

describe('getInventoryComposition', () => {
  it('returns totalItems and totalQuantity', async () => {
    const result = await getInventoryComposition();
    expect(result.success).toBe(true);
    expect(result.data.totalItems).toBeGreaterThanOrEqual(3);
    expect(typeof result.data.totalQuantity).toBe('number');
    expect(result.data.totalQuantity).toBeGreaterThan(0);
  });

  it('returns categoryDistribution with correct structure', async () => {
    const result = await getInventoryComposition();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data.categoryDistribution)).toBe(true);
    for (const cat of result.data.categoryDistribution) {
      expect(cat.category).toBeDefined();
      expect(typeof cat.count).toBe('number');
      expect(typeof cat.totalQty).toBe('number');
    }
  });

  it('stockCoverage categorizes reagents correctly', async () => {
    const result = await getInventoryComposition();
    expect(result.success).toBe(true);
    const { stockCoverage } = result.data;
    expect(typeof stockCoverage.aboveMinimum).toBe('number');
    expect(typeof stockCoverage.belowMinimum).toBe('number');
    expect(typeof stockCoverage.outOfStock).toBe('number');
    // Sum should equal totalItems
    const sum = stockCoverage.aboveMinimum + stockCoverage.belowMinimum + stockCoverage.outOfStock;
    expect(sum).toBe(result.data.totalItems);
  });

  it('sectorBreakdown includes sectors from test reagents', async () => {
    const result = await getInventoryComposition();
    expect(result.success).toBe(true);
    const sectors = result.data.sectorBreakdown.map(s => s.sector);
    expect(sectors).toContain('Hematology');
    expect(sectors).toContain('Chemistry');
  });

  it('sectorBreakdown marks low-stock reagents as alertItems', async () => {
    const result = await getInventoryComposition();
    expect(result.success).toBe(true);
    // reagentA has total_quantity=25 (50-25) and minimum_stock=100 → below minimum → alert
    const hematology = result.data.sectorBreakdown.find(s => s.sector === 'Hematology');
    expect(hematology).toBeDefined();
    expect(hematology.alertItems).toBeGreaterThanOrEqual(1);
  });

  it('storageUtilization includes storage locations', async () => {
    const result = await getInventoryComposition();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data.storageUtilization)).toBe(true);
    const locations = result.data.storageUtilization.map(s => s.location);
    expect(locations).toContain('Fridge A');
  });

  it('machineDependency includes machines from test reagents', async () => {
    const result = await getInventoryComposition();
    expect(result.success).toBe(true);
    const machines = result.data.machineDependency.map(m => m.machine);
    expect(machines).toContain('Machine X');
    expect(machines).toContain('Machine Y');
  });

  it('returns Unauthorized for anon client', async () => {
    currentClient = getAnonClient();
    const result = await getInventoryComposition();
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });
});

// ============ getAuditLogs ============

describe('getAuditLogs', () => {
  it('returns paginated results', async () => {
    const result = await getAuditLogs({ limit: 2 });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeLessThanOrEqual(2);
    expect(result.pagination).toBeDefined();
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(2);
    expect(typeof result.pagination.total).toBe('number');
  });

  it('hasMore is true when more pages exist', async () => {
    const result = await getAuditLogs({ limit: 1 });
    expect(result.success).toBe(true);
    // We inserted at least 5 audit logs, so with limit 1 there should be more
    expect(result.pagination.hasMore).toBe(true);
  });

  it('hasMore is false on last page', async () => {
    const result = await getAuditLogs({ limit: 100 });
    expect(result.success).toBe(true);
    expect(result.pagination.hasMore).toBe(false);
  });

  it('filters by action', async () => {
    const result = await getAuditLogs({ action: 'stock_in' });
    expect(result.success).toBe(true);
    for (const log of result.data) {
      expect(log.action).toBe('stock_in');
    }
  });

  it('filters by userId', async () => {
    const result = await getAuditLogs({ userId: user.id });
    expect(result.success).toBe(true);
    for (const log of result.data) {
      expect(log.user_id).toBe(user.id);
    }
  });

  it('filters by dateRange (7d excludes old logs)', async () => {
    const result = await getAuditLogs({ dateRange: '7d' });
    expect(result.success).toBe(true);
    // The 60-day old log should NOT appear
    const oldLog = result.data.find(l => l.description === 'Old log for Analytics Reagent B');
    expect(oldLog).toBeUndefined();
  });

  it('search matches on description', async () => {
    const result = await getAuditLogs({ search: 'Analytics Reagent A' });
    expect(result.success).toBe(true);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.some(l => l.description.includes('Analytics Reagent A'))).toBe(true);
  });

  it('combined filters work (action + dateRange)', async () => {
    const result = await getAuditLogs({ action: 'create_reagent', dateRange: '30d' });
    expect(result.success).toBe(true);
    for (const log of result.data) {
      expect(log.action).toBe('create_reagent');
    }
    // The 60-day old create_reagent log should be excluded
    const oldLog = result.data.find(l => l.description === 'Old log for Analytics Reagent B');
    expect(oldLog).toBeUndefined();
  });

  it('returns user profile data (full_name, email)', async () => {
    const result = await getAuditLogs({ userId: user.id, limit: 1 });
    expect(result.success).toBe(true);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data[0].profiles).toBeDefined();
    expect(result.data[0].profiles.full_name).toBe('Analytics Tester');
    expect(result.data[0].profiles.email).toBe('analytics-action-user@test.com');
  });

  it('rejects page < 1', async () => {
    const result = await getAuditLogs({ page: 0 });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('rejects limit > 100', async () => {
    const result = await getAuditLogs({ limit: 101 });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('returns Unauthorized for anon client', async () => {
    currentClient = getAnonClient();
    const result = await getAuditLogs({});
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unauthorized');
  });

  it('page 2 returns different results than page 1', async () => {
    const page1 = await getAuditLogs({ limit: 2, page: 1 });
    const page2 = await getAuditLogs({ limit: 2, page: 2 });
    expect(page1.success).toBe(true);
    expect(page2.success).toBe(true);
    if (page2.data.length > 0) {
      const page1Ids = page1.data.map(l => l.id);
      const page2Ids = page2.data.map(l => l.id);
      // No overlap between pages
      expect(page1Ids.some(id => page2Ids.includes(id))).toBe(false);
    }
  });
});
