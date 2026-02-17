'use server'

import { withAuth } from "@/libs/auth";
import { getErrorMessage } from "@/libs/utils";
import { auditLogQuerySchema, validateWithSchema } from "@/libs/schemas";

// ============ HELPERS ============

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

function groupByPeriod(movements, periodType = 'month') {
  const byPeriod = {};
  for (const m of movements) {
    const date = new Date(m.performed_at);
    let key, label;
    if (periodType === 'day') {
      key = m.performed_at.split('T')[0];
      label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (periodType === 'week') {
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

// ============ DASHBOARD 1: CONSUMPTION & BURN RATE ============

export async function getMovementTrends(dateRange = '30d', sector = null) {
  return withAuth(async (user, supabase) => {
    const startDate = getStartDate(dateRange);

    const { data: movements, error } = await supabase
      .from("stock_movements")
      .select("movement_type, quantity, performed_at, lots(reagent_id, reagents(sector))")
      .in("movement_type", ["in", "out"])
      .gte("performed_at", startDate);

    if (error) throw error;

    let filtered = movements || [];
    if (sector) {
      filtered = filtered.filter(m => m.lots?.reagents?.sector === sector);
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

export async function getBurnRateData() {
  return withAuth(async (user, supabase) => {
    const { data: reagents, error: rErr } = await supabase
      .from("reagents")
      .select("id, name, total_quantity, minimum_stock, unit, sector, category")
      .eq("is_active", true);

    if (rErr) throw rErr;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: movements, error: mErr } = await supabase
      .from("stock_movements")
      .select("quantity, performed_at, lots(reagent_id)")
      .eq("movement_type", "out")
      .gte("performed_at", ninetyDaysAgo.toISOString());

    if (mErr) throw mErr;

    const consumptionByReagent = {};
    for (const m of (movements || [])) {
      const reagentId = m.lots?.reagent_id;
      if (!reagentId) continue;
      if (!consumptionByReagent[reagentId]) consumptionByReagent[reagentId] = 0;
      consumptionByReagent[reagentId] += Math.abs(m.quantity);
    }

    const daySpan = 90;
    const results = (reagents || [])
      .filter(r => consumptionByReagent[r.id])
      .map(r => {
        const totalConsumed = consumptionByReagent[r.id];
        const avgDailyUse = totalConsumed / daySpan;
        const daysOfSupply = avgDailyUse > 0
          ? Math.round(r.total_quantity / avgDailyUse)
          : null;
        return {
          ...r,
          totalConsumed,
          avgDailyUse: Math.round(avgDailyUse * 10) / 10,
          daysOfSupply
        };
      })
      .sort((a, b) => (a.daysOfSupply ?? 9999) - (b.daysOfSupply ?? 9999));

    const criticalCount = results.filter(r => r.daysOfSupply !== null && r.daysOfSupply < 14).length;

    return { success: true, data: { items: results, criticalCount } };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

export async function getSectorConsumption(dateRange = '30d') {
  return withAuth(async (user, supabase) => {
    const startDate = getStartDate(dateRange);

    const { data: movements, error } = await supabase
      .from("stock_movements")
      .select("quantity, lots(reagents(sector))")
      .eq("movement_type", "out")
      .gte("performed_at", startDate);

    if (error) throw error;

    const bySector = {};
    for (const m of (movements || [])) {
      const sector = m.lots?.reagents?.sector;
      if (!sector) continue;
      if (!bySector[sector]) bySector[sector] = 0;
      bySector[sector] += Math.abs(m.quantity);
    }

    const data = Object.entries(bySector)
      .map(([sector, totalOut]) => ({ sector, totalOut }))
      .sort((a, b) => b.totalOut - a.totalOut);

    return { success: true, data };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}


export async function getMachineConsumption(dateRange = '30d') {
  return withAuth(async (user, supabase) => {
    const startDate = getStartDate(dateRange);

    const { data: movements, error } = await supabase
      .from("stock_movements")
      .select("quantity, lots(reagents(machine))")
      .eq("movement_type", "out")
      .gte("performed_at", startDate);

    if (error) throw error;

    const byMachine = {};
    for (const m of (movements || [])) {
      const machine = m.lots?.reagents?.machine;
      if (!machine) continue;
      if (!byMachine[machine]) byMachine[machine] = 0;
      byMachine[machine] += Math.abs(m.quantity);
    }

    const data = Object.entries(byMachine)
      .map(([machine, totalOut]) => ({ machine, totalOut }))
      .sort((a, b) => b.totalOut - a.totalOut);

    return { success: true, data };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

// ============ DASHBOARD 2: INVENTORY COMPOSITION ============

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

    // Category distribution
    const categoryDistribution = {};
    for (const r of items) {
      if (!categoryDistribution[r.category]) {
        categoryDistribution[r.category] = { count: 0, totalQty: 0 };
      }
      categoryDistribution[r.category].count++;
      categoryDistribution[r.category].totalQty += r.total_quantity;
    }

    // Stock coverage
    const stockCoverage = {
      aboveMinimum: items.filter(r => r.total_quantity > r.minimum_stock).length,
      belowMinimum: items.filter(r => r.total_quantity > 0 && r.total_quantity <= r.minimum_stock).length,
      outOfStock: items.filter(r => r.total_quantity === 0).length,
    };

    // Sector breakdown
    const sectorBreakdown = {};
    for (const r of items) {
      if (!sectorBreakdown[r.sector]) {
        sectorBreakdown[r.sector] = { sector: r.sector, totalItems: 0, alertItems: 0, totalQty: 0 };
      }
      sectorBreakdown[r.sector].totalItems++;
      sectorBreakdown[r.sector].totalQty += r.total_quantity;
      if (r.total_quantity <= r.minimum_stock || expiredReagentIds.has(r.id)) {
        sectorBreakdown[r.sector].alertItems++;
      }
    }

    // Storage utilization
    const storageUtilization = {};
    for (const r of items) {
      const loc = r.storage_location || 'Unspecified';
      if (!storageUtilization[loc]) storageUtilization[loc] = 0;
      storageUtilization[loc]++;
    }

    // Machine dependency
    const machineDependency = {};
    for (const r of items) {
      if (!r.machine) continue;
      if (!machineDependency[r.machine]) {
        machineDependency[r.machine] = { machine: r.machine, totalItems: 0, alertItems: 0 };
      }
      machineDependency[r.machine].totalItems++;
      if (r.total_quantity <= r.minimum_stock || expiredReagentIds.has(r.id)) {
        machineDependency[r.machine].alertItems++;
      }
    }

    return {
      success: true,
      data: {
        totalItems: items.length,
        totalQuantity: items.reduce((sum, r) => sum + r.total_quantity, 0),
        belowMinimum: stockCoverage.belowMinimum,
        outOfStock: stockCoverage.outOfStock,
        categoryDistribution: Object.entries(categoryDistribution)
          .map(([category, stats]) => ({ category, ...stats })),
        stockCoverage,
        sectorBreakdown: Object.values(sectorBreakdown).sort((a, b) => b.totalItems - a.totalItems),
        storageUtilization: Object.entries(storageUtilization)
          .map(([location, count]) => ({ location, count }))
          .sort((a, b) => b.count - a.count),
        machineDependency: Object.values(machineDependency).sort((a, b) => b.totalItems - a.totalItems),
      }
    };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

// ============ DASHBOARD 3: ACTIVITY & AUDIT ============

export async function getActivityOverview(dateRange = '30d') {
  return withAuth(async (user, supabase) => {
    const startDate = getStartDate(dateRange);

    const { data: movements, error } = await supabase
      .from("stock_movements")
      .select("id, movement_type, quantity, performed_at, notes, lot_id, lots(lot_number, reagents(name)), profiles:performed_by(full_name, email)")
      .gte("performed_at", startDate)
      .order("performed_at", { ascending: false });

    if (error) throw error;

    const items = movements || [];

    // Daily activity
    const dailyActivity = {};
    for (const m of items) {
      const date = m.performed_at.split('T')[0];
      if (!dailyActivity[date]) {
        dailyActivity[date] = { date, in: 0, out: 0, adjustment: 0, expired: 0, damaged: 0 };
      }
      dailyActivity[date][m.movement_type]++;
    }

    // Activity by type
    const byType = {};
    for (const m of items) {
      if (!byType[m.movement_type]) byType[m.movement_type] = 0;
      byType[m.movement_type]++;
    }

    // Top active users
    const byUser = {};
    for (const m of items) {
      const name = m.profiles?.full_name || m.profiles?.email || 'Unknown';
      if (!byUser[name]) byUser[name] = 0;
      byUser[name]++;
    }
    const topUsers = Object.entries(byUser)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Most active day
    const dailyArray = Object.values(dailyActivity);
    let mostActiveDay = null;
    if (dailyArray.length > 0) {
      mostActiveDay = dailyArray.reduce((max, day) => {
        const dayTotal = day.in + day.out + day.adjustment + day.expired + day.damaged;
        const maxTotal = max.in + max.out + max.adjustment + max.expired + max.damaged;
        return dayTotal > maxTotal ? day : max;
      });
    }

    return {
      success: true,
      data: {
        totalMovements: items.length,
        mostActiveDay,
        dailyActivity: Object.values(dailyActivity).sort((a, b) => a.date.localeCompare(b.date)),
        byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
        topUsers,
      }
    };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

export async function getLotLifecycleStats() {
  return withAuth(async (user, supabase) => {
    const { data: depletedLots, error: lErr } = await supabase
      .from("lots")
      .select("id, date_of_reception")
      .eq("is_active", true)
      .eq("quantity", 0);

    if (lErr) throw lErr;

    if (!depletedLots || depletedLots.length === 0) {
      return { success: true, data: { avgDays: null, medianDays: null, count: 0 } };
    }

    const lotIds = depletedLots.map(l => l.id);

    // Get last stock_out movements for depleted lots
    const { data: lastMovements, error: mErr } = await supabase
      .from("stock_movements")
      .select("lot_id, performed_at")
      .in("lot_id", lotIds)
      .eq("movement_type", "out")
      .order("performed_at", { ascending: false });

    if (mErr) throw mErr;

    const lastMovementByLot = {};
    for (const m of (lastMovements || [])) {
      if (!lastMovementByLot[m.lot_id]) {
        lastMovementByLot[m.lot_id] = m.performed_at;
      }
    }

    const durations = depletedLots
      .filter(l => lastMovementByLot[l.id])
      .map(l => {
        const reception = new Date(l.date_of_reception);
        const depletion = new Date(lastMovementByLot[l.id]);
        return Math.ceil((depletion - reception) / (1000 * 60 * 60 * 24));
      })
      .filter(d => d > 0)
      .sort((a, b) => a - b);

    if (durations.length === 0) {
      return { success: true, data: { avgDays: null, medianDays: null, count: 0 } };
    }

    const avgDays = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const medianDays = durations[Math.floor(durations.length / 2)];

    return { success: true, data: { avgDays, medianDays, count: durations.length } };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

// ============ AUDIT LOGS ============

export async function getAuditLogs(params = {}) {
  const validated = validateWithSchema(auditLogQuerySchema, params);
  if (!validated.success) return validated;

  const { page, limit, search, resourceType } = validated.data;

  return withAuth(async (user, supabase) => {
    let query = supabase
      .from("audit_logs")
      .select("*, profiles:user_id(full_name, email)", { count: 'exact' })
      .order("performed_at", { ascending: false });

    if (resourceType) {
      query = query.eq("resource_type", resourceType);
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

export async function getAuditLogCount() {
  return withAuth(async (user, supabase) => {
    const { count, error } = await supabase
      .from("audit_logs")
      .select("id", { count: 'exact', head: true });

    if (error) throw error;

    return { success: true, count: count || 0 };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error), count: 0 }));
}
