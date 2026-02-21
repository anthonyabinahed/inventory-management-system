'use server'

import { withAuth } from "@/libs/auth";
import { getErrorMessage } from "@/libs/utils";
import { auditLogQuerySchema, validateWithSchema } from "@/libs/schemas";

// ============ HELPERS ============

/**
 * Converts a date range shorthand into an ISO timestamp for query filtering.
 *
 * @param {'7d'|'30d'|'90d'|'6m'} dateRange - Shorthand for how far back to look
 * @returns {string} ISO 8601 timestamp (e.g. "2026-01-21T08:30:00.000Z")
 */
function getStartDate(dateRange) {
  const now = new Date();
  switch (dateRange) {
    case '7d': now.setDate(now.getDate() - 7); break;
    case '30d': now.setDate(now.getDate() - 30); break;
    case '90d': now.setDate(now.getDate() - 90); break;
    case '6m': now.setMonth(now.getMonth() - 6); break;
    default: now.setDate(now.getDate() - 30);
  }
  return now.toISOString();
}

/**
 * Groups stock movements into time buckets and sums in/out quantities per bucket.
 *
 * @param {Array} movements - Rows with { performed_at, movement_type, quantity }
 * @param {'day'|'week'|'month'} periodType - Bucket granularity
 * @returns {Array<{ key: string, label: string, in: number, out: number }>}
 *   Sorted chronologically. `key` is a sortable date string (YYYY-MM-DD or YYYY-MM),
 *   `label` is the human-readable display text for chart axes.
 *
 *   day   → key: "2026-01-15",  label: "Jan 15"
 *   week  → key: "2026-01-12",  label: "Jan 12–Jan 18"
 *   month → key: "2026-01",     label: "Jan 2026"
 */
function groupByPeriod(movements, periodType = 'month') {
  const byPeriod = {};

  for (const m of movements) {
    const date = new Date(m.performed_at);
    let key, label;

    if (periodType === 'day') {
      key = m.performed_at.split('T')[0];
      label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    } else if (periodType === 'week') {
      // Snap to Sunday–Saturday week boundaries
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      key = startOfWeek.toISOString().split('T')[0];
      const startLabel = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endLabel = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      label = `${startLabel}–${endLabel}`;

    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    if (!byPeriod[key]) byPeriod[key] = { key, label, in: 0, out: 0 };

    const qty = Math.abs(m.quantity);
    if (m.movement_type === 'in') byPeriod[key].in += qty;
    if (m.movement_type === 'out') byPeriod[key].out += qty;
  }

  return Object.values(byPeriod).sort((a, b) => a.key.localeCompare(b.key));
}

// ============ DASHBOARD 1: CONSUMPTION ============

/**
 * Returns stock in/out movement data grouped by time period, with optional
 * sector and machine filters. Used by the ConsumptionDashboard trend chart.
 *
 * Period granularity is chosen automatically based on dateRange:
 *   7d/30d → daily, 90d → weekly, 6m → monthly
 *
 * @param {'7d'|'30d'|'90d'|'6m'} dateRange
 * @param {string|null} sector - Filter to a specific reagent sector
 * @param {string|null} machine - Filter to a specific machine
 * @returns {{ success, data: { trends: Array, totalIn: number, totalOut: number } }}
 */
export async function getMovementTrends(dateRange = '30d', sector = null, machine = null) {
  return withAuth(async (user, supabase) => {
    const startDate = getStartDate(dateRange);

    const { data: movements, error } = await supabase
      .from("stock_movements")
      .select("movement_type, quantity, performed_at, lots(reagent_id, reagents(sector, machine))")
      .in("movement_type", ["in", "out"])
      .gte("performed_at", startDate);

    if (error) throw error;

    let filtered = movements || [];
    if (sector) {
      filtered = filtered.filter(m => m.lots?.reagents?.sector === sector);
    }
    if (machine) {
      filtered = filtered.filter(m => m.lots?.reagents?.machine === machine);
    }

    const periodType = ['7d', '30d'].includes(dateRange) ? 'day' : dateRange === '90d' ? 'week' : 'month';
    const grouped = groupByPeriod(filtered, periodType);

    // Also compute totals
    let totalIn = 0, totalOut = 0;
    for (const m of filtered) {
      const qty = Math.abs(m.quantity);
      if (m.movement_type === 'in') totalIn += qty;
      if (m.movement_type === 'out') totalOut += qty;
    }

    return { success: true, data: { trends: grouped, totalIn, totalOut } };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

/**
 * Returns the most-consumed reagents ranked by total stock-out quantity.
 * Aggregates all "out" movements per reagent, then returns the top N.
 * Movements with deleted lots (lot_id = null) are silently skipped.
 *
 * @param {'7d'|'30d'|'90d'|'6m'} dateRange
 * @param {number} limit - Max items to return (default 10)
 * @returns {{ success, data: Array<{ id, name, category, unit, totalOut }> }}
 */
export async function getTopConsumedItems(dateRange = '30d', limit = 10) {
  return withAuth(async (user, supabase) => {
    const startDate = getStartDate(dateRange);

    const { data: movements, error } = await supabase
      .from("stock_movements")
      .select("quantity, lots(reagent_id, reagents(id, name, category, unit))")
      .eq("movement_type", "out")
      .gte("performed_at", startDate);

    if (error) throw error;

    const byReagent = {};
    for (const m of (movements || [])) {
      const reagent = m.lots?.reagents;
      if (!reagent) continue;
      if (!byReagent[reagent.id]) {
        byReagent[reagent.id] = { ...reagent, totalOut: 0 };
      }
      byReagent[reagent.id].totalOut += Math.abs(m.quantity);
    }

    const sorted = Object.values(byReagent)
      .sort((a, b) => b.totalOut - a.totalOut)
      .slice(0, limit);

    return { success: true, data: sorted };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

/**
 * Generic helper: aggregates stock-out quantities by a reagent field (e.g. "sector" or "machine").
 * Fetches all "out" movements in the date range, groups by the given field, and returns
 * totals sorted descending. Entries with null/undefined field values are excluded.
 *
 * @param {'7d'|'30d'|'90d'|'6m'} dateRange
 * @param {string} field - Reagent column to group by ("sector" or "machine")
 * @returns {{ success, data: Array<{ [field]: string, totalOut: number }> }}
 */
async function getConsumptionByField(dateRange, field) {
  return withAuth(async (user, supabase) => {
    const startDate = getStartDate(dateRange);

    const { data: movements, error } = await supabase
      .from("stock_movements")
      .select(`quantity, lots(reagents(${field}))`)
      .eq("movement_type", "out")
      .gte("performed_at", startDate);

    if (error) throw error;

    const grouped = {};
    for (const m of (movements || [])) {
      const value = m.lots?.reagents?.[field];
      if (!value) continue;
      if (!grouped[value]) grouped[value] = 0;
      grouped[value] += Math.abs(m.quantity);
    }

    const data = Object.entries(grouped)
      .map(([key, totalOut]) => ({ [field]: key, totalOut }))
      .sort((a, b) => b.totalOut - a.totalOut);

    return { success: true, data };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

/** Total stock-out per sector, sorted descending. */
export async function getSectorConsumption(dateRange = '30d') {
  return getConsumptionByField(dateRange, 'sector');
}

/** Total stock-out per machine, sorted descending. Reagents with no machine are excluded. */
export async function getMachineConsumption(dateRange = '30d') {
  return getConsumptionByField(dateRange, 'machine');
}

// ============ DASHBOARD 2: INVENTORY COMPOSITION ============

/** Returns true if a reagent is below minimum stock or has expired lots. */
function isAlertItem(reagent, expiredReagentIds) {
  return reagent.total_quantity <= reagent.minimum_stock || expiredReagentIds.has(reagent.id);
}

/** Items and total stock per category (reagent, control, calibrator, etc.) */
function buildCategoryDistribution(items) {
  const map = {};
  for (const r of items) {
    if (!map[r.category]) map[r.category] = { count: 0, totalQty: 0 };
    map[r.category].count++;
    map[r.category].totalQty += r.total_quantity;
  }
  return Object.entries(map).map(([category, stats]) => ({ category, ...stats }));
}

/** How many items are above minimum, below minimum, or out of stock. */
function buildStockCoverage(items) {
  return {
    aboveMinimum: items.filter(r => r.total_quantity > r.minimum_stock).length,
    belowMinimum: items.filter(r => r.total_quantity > 0 && r.total_quantity <= r.minimum_stock).length,
    outOfStock: items.filter(r => r.total_quantity === 0).length,
  };
}

/** Items, stock, and alert count per sector. Sorted by totalItems descending. */
function buildSectorBreakdown(items, expiredReagentIds) {
  const map = {};
  for (const r of items) {
    if (!map[r.sector]) map[r.sector] = { sector: r.sector, totalItems: 0, alertItems: 0, totalQty: 0 };
    map[r.sector].totalItems++;
    map[r.sector].totalQty += r.total_quantity;
    if (isAlertItem(r, expiredReagentIds)) map[r.sector].alertItems++;
  }
  return Object.values(map).sort((a, b) => b.totalItems - a.totalItems);
}

/** Item count per storage location. Null locations become "Unspecified". Sorted by count descending. */
function buildStorageUtilization(items) {
  const map = {};
  for (const r of items) {
    const loc = r.storage_location || 'Unspecified';
    if (!map[loc]) map[loc] = 0;
    map[loc]++;
  }
  return Object.entries(map)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count);
}

/** Items and alert count per machine. Reagents with no machine are excluded. Sorted by totalItems descending. */
function buildMachineDependency(items, expiredReagentIds) {
  const map = {};
  for (const r of items) {
    if (!r.machine) continue;
    if (!map[r.machine]) map[r.machine] = { machine: r.machine, totalItems: 0, alertItems: 0 };
    map[r.machine].totalItems++;
    if (isAlertItem(r, expiredReagentIds)) map[r.machine].alertItems++;
  }
  return Object.values(map).sort((a, b) => b.totalItems - a.totalItems);
}

/**
 * Returns a full snapshot of the current inventory state. No date range — this is
 * a point-in-time view. Used by the InventoryCompositionDashboard.
 *
 * Runs two queries:
 *   1. All active reagents (for counts, categories, stock levels)
 *   2. Active lots with stock that are past expiry (to flag alert items)
 *
 * An "alert item" is a reagent that is either below minimum stock or has expired lots.
 */
export async function getInventoryComposition() {
  return withAuth(async (user, supabase) => {
    const { data: reagents, error: rErr } = await supabase
      .from("reagents")
      .select("id, name, category, sector, machine, storage_location, total_quantity, minimum_stock, unit")
      .eq("is_active", true);

    if (rErr) throw rErr;

    const today = new Date().toISOString().split('T')[0];
    const { data: expiredLots, error: eErr } = await supabase
      .from("lots")
      .select("reagent_id")
      .eq("is_active", true)
      .gt("quantity", 0)
      .not("expiry_date", "is", null)
      .lt("expiry_date", today);

    if (eErr) throw eErr;

    const expiredReagentIds = new Set((expiredLots || []).map(l => l.reagent_id));
    const items = reagents || [];
    const stockCoverage = buildStockCoverage(items);

    return {
      success: true,
      data: {
        totalItems: items.length,
        totalQuantity: items.reduce((sum, r) => sum + r.total_quantity, 0),
        belowMinimum: stockCoverage.belowMinimum,
        outOfStock: stockCoverage.outOfStock,
        categoryDistribution: buildCategoryDistribution(items),
        stockCoverage,
        sectorBreakdown: buildSectorBreakdown(items, expiredReagentIds),
        storageUtilization: buildStorageUtilization(items),
        machineDependency: buildMachineDependency(items, expiredReagentIds),
      }
    };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

// ============ AUDIT LOGS ============

/**
 * Queries the immutable audit_logs table with filtering, search, and pagination.
 * Used by the ActivityAuditDashboard.
 *
 * Params are validated against `auditLogQuerySchema` before the query runs:
 *   - page (default 1), limit (default 20, max 100)
 *   - search — ilike match on description and action columns
 *   - action — exact match (e.g. "stock_in", "create_reagent")
 *   - resourceType — exact match (e.g. "reagent", "lot", "user")
 *   - userId — exact match on user_id
 *   - dateRange — '7d'|'30d'|'90d'|'6m'
 *
 * Each log is returned with a joined `profiles` object (full_name, email).
 *
 * @param {Object} params - Query parameters (all optional)
 * @returns {{ success, data: Array, pagination: { page, limit, total, hasMore } }}
 */
export async function getAuditLogs(params = {}) {
  const validated = validateWithSchema(auditLogQuerySchema, params);
  if (!validated.success) return validated;

  const { page, limit, search, resourceType, action, dateRange, userId } = validated.data;

  return withAuth(async (user, supabase) => {
    let query = supabase
      .from("audit_logs")
      .select("*, profiles:user_id(full_name, email)", { count: 'exact' })
      .order("performed_at", { ascending: false });

    if (resourceType) {
      query = query.eq("resource_type", resourceType);
    }

    if (action) {
      query = query.eq("action", action);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (dateRange) {
      const startDate = getStartDate(dateRange);
      query = query.gte("performed_at", startDate);
    }

    if (search) {
      const safe = search.replace(/"/g, '\\"');
      const pattern = `"%${safe}%"`;
      query = query.or(`description.ilike.${pattern},action.ilike.${pattern}`);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      },
    };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error), data: [], pagination: { page: 1, limit: 20, total: 0, hasMore: false } }));
}
