'use server'

import { withAuth } from "@/libs/auth";
import { getErrorMessage } from "@/libs/utils";
import { reagentSchema, reagentUpdateSchema, stockInSchema, stockOutSchema, validateWithSchema } from "@/libs/schemas";
import { logAuditEvent } from "@/libs/audit";

// ============ HELPER FUNCTIONS ============

/**
 * Recalculate and update total_quantity for a reagent based on its active lots.
 * Call after any lot quantity change (stockIn, stockOut, deleteLot).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} reagentId
 * @param {string} userId - Written to reagent's `updated_by` field
 * @returns {Promise<number>} The new total_quantity
 */
async function recalculateReagentTotalQuantity(supabase, reagentId, userId) {
  // Sum quantities from all active lots for this reagent
  const { data: lots, error: lotsError } = await supabase
    .from("lots")
    .select("quantity")
    .eq("reagent_id", reagentId)
    .eq("is_active", true);

  if (lotsError) throw lotsError;

  const totalQuantity = (lots || []).reduce((sum, lot) => sum + lot.quantity, 0);

  // Update the reagent's total_quantity
  const { error: updateError } = await supabase
    .from("reagents")
    .update({ 
      total_quantity: totalQuantity,
      updated_by: userId
    })
    .eq("id", reagentId);

  if (updateError) throw updateError;

  return totalQuantity;
}

// ============ REAGENT CRUD OPERATIONS ============

/**
 * Get all reagents with optional filtering and pagination.
 * Returns master reagent data with total_quantity (aggregated from lots).
 * @param {object} [opts]
 * @param {number} [opts.page=1]
 * @param {number} [opts.limit=25]
 * @param {object} [opts.filters={}]
 * @param {string}  [opts.filters.category]
 * @param {string}  [opts.filters.sector]
 * @param {string}  [opts.filters.machine]
 * @param {string}  [opts.filters.supplier]       - Partial match
 * @param {string}  [opts.filters.storage_location] - Partial match
 * @param {string}  [opts.filters.search]         - Matches name, reference, or description
 * @param {boolean} [opts.filters.lowStock]        - Only reagents at or below minimum_stock
 * @param {boolean} [opts.filters.hasExpiredLots]  - Only reagents with at least one expired lot
 * @returns {Promise<{success: boolean, data: object[], pagination: object, errorMessage?: string}>}
 */
export async function getReagents({
  page = 1,
  limit = 25,
  filters = {}
} = {}) {
  return withAuth(async (user, supabase) => {
    // If filtering by hasExpiredLots, first get reagent IDs with expired lots
    let expiredReagentIds = null;
    if (filters.hasExpiredLots) {
      const today = new Date().toISOString().split('T')[0];
      const { data: expiredLots, error: expiredError } = await supabase
        .from("lots")
        .select("reagent_id")
        .eq("is_active", true)
        .gt("quantity", 0)
        .lt("expiry_date", today);

      if (expiredError) throw expiredError;

      // Get unique reagent IDs
      expiredReagentIds = [...new Set(expiredLots?.map(l => l.reagent_id) || [])];

      // If no expired lots found, return empty result
      if (expiredReagentIds.length === 0) {
        return {
          success: true,
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 }
        };
      }
    }

    // For lowStock filter, we need to fetch all data first since Supabase doesn't support column comparison
    const needsClientFilter = filters.lowStock;

    let query = supabase
      .from("reagents")
      .select("*", { count: 'exact' })
      .eq("is_active", true);

    // Filter by expired reagent IDs if applicable
    if (expiredReagentIds) {
      query = query.in("id", expiredReagentIds);
    }

    // Apply filters
    if (filters.category) {
      query = query.eq("category", filters.category);
    }
    if (filters.sector) {
      query = query.eq("sector", filters.sector);
    }
    if (filters.machine) {
      query = query.eq("machine", filters.machine);
    }
    if (filters.supplier) {
      query = query.ilike("supplier", `%${filters.supplier}%`);
    }
    if (filters.storage_location) {
      query = query.ilike("storage_location", `%${filters.storage_location}%`);
    }
    if (filters.search) {
      const safe = filters.search.replace(/"/g, '\\"');
      const pattern = `"%${safe}%"`;
      query = query.or(`name.ilike.${pattern},reference.ilike.${pattern},description.ilike.${pattern}`);
    }

    // Apply sorting
    query = query.order('name', { ascending: true });

    // Only apply pagination at database level if we don't need client-side filtering
    if (!needsClientFilter) {
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    let filteredData = data || [];
    let totalCount = count || 0;

    // Client-side filter for low stock (column comparison not supported in Supabase)
    if (filters.lowStock) {
      filteredData = filteredData.filter(r => r.total_quantity <= r.minimum_stock);
      totalCount = filteredData.length;
      
      // Apply pagination client-side
      const offset = (page - 1) * limit;
      filteredData = filteredData.slice(offset, offset + limit);
    }

    return {
      success: true,
      data: filteredData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error), data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } }));
}

/**
 * Get a single reagent by ID.
 * @param {string} id - Reagent UUID
 * @returns {Promise<{success: boolean, data?: object, errorMessage?: string}>}
 */
export async function getReagentById(id) {
  return withAuth(async (user, supabase) => {
    const { data, error } = await supabase
      .from("reagents")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return { success: true, data };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

/**
 * Create a new reagent (master data only).
 * New reagents start with total_quantity = 0; stock is added via stockIn.
 * @param {object} reagentData - Validated against `reagentSchema`
 * @returns {Promise<{success: boolean, data?: object, errorMessage?: string}>}
 */
export async function createReagent(reagentData) {
  const validated = validateWithSchema(reagentSchema, reagentData);
  if (!validated.success) return validated;

  return withAuth(async (user, supabase) => {
    const { data, error } = await supabase
      .from("reagents")
      .insert({
        ...validated.data,
        total_quantity: 0,  // Starts empty, updated via lots
        created_by: user.id,
        updated_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent(supabase, user.id, {
      action: 'create_reagent',
      resourceType: 'reagent',
      resourceId: data.id,
      description: `Created reagent "${data.name}"`,
    });

    return { success: true, data };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

/**
 * Update an existing reagent (master data only).
 * Does not touch lot quantities; use stockIn/stockOut for that.
 * @param {string} id - Reagent UUID
 * @param {object} updates - Validated against `reagentUpdateSchema`
 * @returns {Promise<{success: boolean, data?: object, errorMessage?: string}>}
 */
export async function updateReagent(id, updates) {
  const validated = validateWithSchema(reagentUpdateSchema, updates);
  if (!validated.success) return validated;

  return withAuth(async (user, supabase) => {
    const { data, error } = await supabase
      .from("reagents")
      .update({
        ...validated.data,
        updated_by: user.id
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent(supabase, user.id, {
      action: 'update_reagent',
      resourceType: 'reagent',
      resourceId: id,
      description: `Updated reagent "${data.name}"`,
    });

    return { success: true, data };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

/**
 * Soft delete a reagent and all its lots (sets is_active = false on both).
 * @param {string} id - Reagent UUID
 * @returns {Promise<{success: boolean, errorMessage?: string}>}
 */
export async function deleteReagent(id) {
  return withAuth(async (user, supabase) => {
    // Fetch reagent name before soft-deleting (for audit log)
    const { data: reagent } = await supabase
      .from("reagents")
      .select("name")
      .eq("id", id)
      .single();

    // Soft delete reagent
    const { error } = await supabase
      .from("reagents")
      .update({ is_active: false, updated_by: user.id })
      .eq("id", id);

    if (error) throw error;

    // Also soft delete all lots for this reagent
    await supabase
      .from("lots")
      .update({ is_active: false, updated_by: user.id })
      .eq("reagent_id", id);

    await logAuditEvent(supabase, user.id, {
      action: 'delete_reagent',
      resourceType: 'reagent',
      resourceId: id,
      description: `Deleted reagent "${reagent?.name || id}"`,
    });

    return { success: true };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

// ============ LOT OPERATIONS ============

/**
 * Get lots for a reagent, with server-side filtering and pagination.
 * @param {string} reagentId
 * @param {object} opts
 * @param {boolean} opts.includeInactive - Include soft-deleted lots (default: false)
 * @param {boolean} opts.hideOutOfStock  - Exclude lots with quantity <= 0 (default: false)
 * @param {boolean} opts.hideExpired     - Exclude lots past their expiry date (default: false)
 * @param {number}  opts.page            - Page number, 1-indexed (default: 1)
 * @param {number}  opts.limit           - Lots per page (default: 7)
 */
export async function getLotsForReagent(
  reagentId,
  { includeInactive = false, hideOutOfStock = false, hideExpired = false, page = 1, limit = 7 } = {}
) {
  return withAuth(async (user, supabase) => {
    let query = supabase
      .from("lots")
      .select("*", { count: "exact" })
      .eq("reagent_id", reagentId)
      // Expired lots (past dates) sort first because dates are smallest;
      // null expiry goes last (NULLS LAST). Matches the previous client-side sort.
      .order("expiry_date", { ascending: true, nullsFirst: false });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    if (hideOutOfStock) {
      query = query.gt("quantity", 0);
    }

    if (hideExpired) {
      const today = new Date().toISOString().split("T")[0];
      // Keep lots with no expiry date OR expiry date >= today
      query = query.or(`expiry_date.is.null,expiry_date.gte.${today}`);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    const total = count ?? 0;
    return {
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error), data: [], pagination: null }));
}

/**
 * Stock In — add stock to an existing lot or create a new lot.
 * If lot_number already exists for the reagent, quantity is added and the
 * original expiry date is preserved. Otherwise a new lot row is created.
 * Recalculates the reagent's total_quantity when done.
 * @param {object} params - Validated against `stockInSchema`
 * @param {string} params.reagent_id
 * @param {string} params.lot_number
 * @param {number} params.quantity
 * @param {string} [params.expiry_date]        - ISO date; ignored when adding to existing lot
 * @param {string} [params.date_of_reception]  - ISO date; defaults to today
 * @param {string} [params.notes]
 * @returns {Promise<{success: boolean, data?: object, action?: 'created'|'updated', errorMessage?: string}>}
 */
export async function stockIn(params) {
  const validated = validateWithSchema(stockInSchema, params);
  if (!validated.success) return validated;

  const { reagent_id, lot_number, quantity, expiry_date, date_of_reception, notes } = validated.data;

  return withAuth(async (user, supabase) => {
    // Check if lot already exists for this reagent
    const { data: existingLot } = await supabase
      .from("lots")
      .select("*")
      .eq("reagent_id", reagent_id)
      .eq("lot_number", lot_number)
      .eq("is_active", true)
      .maybeSingle();

    let lot;
    let action;

    if (existingLot) {
      // Add to existing lot (keep original expiry date)
      const newQuantity = existingLot.quantity + quantity;

      const { data, error } = await supabase
        .from("lots")
        .update({
          quantity: newQuantity,
          updated_by: user.id
        })
        .eq("id", existingLot.id)
        .select()
        .single();

      if (error) throw error;

      lot = data;
      action = 'updated';

      // Log stock movement
      await logStockMovement(supabase, user.id, {
        lot_id: existingLot.id,
        movement_type: 'in',
        quantity,
        quantity_before: existingLot.quantity,
        quantity_after: newQuantity,
        notes
      });
    } else {
      // Create new lot
      const { data, error } = await supabase
        .from("lots")
        .insert({
          reagent_id,
          lot_number,
          quantity,
          expiry_date: expiry_date || null,
          date_of_reception: date_of_reception || new Date().toISOString().split('T')[0],
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      lot = data;
      action = 'created';

      // Log stock movement
      await logStockMovement(supabase, user.id, {
        lot_id: data.id,
        movement_type: 'in',
        quantity,
        quantity_before: 0,
        quantity_after: quantity,
        notes: notes || 'New lot created'
      });
    }

    // Recalculate reagent total_quantity after lot change
    await recalculateReagentTotalQuantity(supabase, reagent_id, user.id);

    await logAuditEvent(supabase, user.id, {
      action: 'stock_in',
      resourceType: 'lot',
      resourceId: lot.id,
      description: `Stocked in ${quantity} to lot ${lot_number} / reagent ${reagent_id} ${action === 'created' ? ' (new lot)' : ''}`,
    });

    return { success: true, data: lot, action };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

/**
 * Stock Out — remove stock from a specific lot.
 * Returns an error if the requested quantity exceeds the lot's current stock.
 * Recalculates the reagent's total_quantity when done.
 * @param {string} lotId   - Lot UUID
 * @param {number} quantity - Amount to remove (must be > 0 and <= lot.quantity)
 * @param {object} [opts]
 * @param {string} [opts.notes]
 * @returns {Promise<{success: boolean, newQuantity?: number, errorMessage?: string}>}
 */
export async function stockOut(lotId, quantity, opts = {}) {
  const validated = validateWithSchema(stockOutSchema, { quantity, ...opts });
  if (!validated.success) return validated;

  quantity = validated.data.quantity;
  const notes = validated.data.notes;

  return withAuth(async (user, supabase) => {
    // Get current lot (including lot_number for audit)
    const { data: lot, error: fetchError } = await supabase
      .from("lots")
      .select("*")
      .eq("id", lotId)
      .single();

    if (fetchError) throw fetchError;

    if (lot.quantity < quantity) {
      return { success: false, errorMessage: "Insufficient stock in this lot" };
    }

    const newQuantity = lot.quantity - quantity;

    // Update lot quantity
    const { error: updateError } = await supabase
      .from("lots")
      .update({ quantity: newQuantity, updated_by: user.id })
      .eq("id", lotId);

    if (updateError) throw updateError;

    // Log the movement
    await logStockMovement(supabase, user.id, {
      lot_id: lotId,
      movement_type: 'out',
      quantity: -quantity,  // Negative for out
      quantity_before: lot.quantity,
      quantity_after: newQuantity,
      notes
    });

    // Recalculate reagent total_quantity after lot change
    await recalculateReagentTotalQuantity(supabase, lot.reagent_id, user.id);

    await logAuditEvent(supabase, user.id, {
      action: 'stock_out',
      resourceType: 'lot',
      resourceId: lotId,
      description: `Stocked out ${quantity} from lot ${lot.lot_number || lotId}`,
    });

    return { success: true, newQuantity };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}


/**
 * Soft delete a lot (sets is_active = false).
 * Recalculates the parent reagent's total_quantity when done.
 * @param {string} lotId - Lot UUID
 * @returns {Promise<{success: boolean, errorMessage?: string}>}
 */
export async function deleteLot(lotId) {
  return withAuth(async (user, supabase) => {
    // First get the lot to know which reagent to update
    const { data: lot, error: fetchError } = await supabase
      .from("lots")
      .select("reagent_id, lot_number")
      .eq("id", lotId)
      .single();

    if (fetchError) throw fetchError;

    // Soft delete the lot
    const { error } = await supabase
      .from("lots")
      .update({ is_active: false, updated_by: user.id })
      .eq("id", lotId);

    if (error) throw error;

    // Recalculate reagent total_quantity after lot deletion
    await recalculateReagentTotalQuantity(supabase, lot.reagent_id, user.id);

    await logAuditEvent(supabase, user.id, {
      action: 'delete_lot',
      resourceType: 'lot',
      resourceId: lotId,
      description: `Deleted lot "${lot.lot_number} / reagent ${lot.reagent_id}"`,
    });

    return { success: true };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

// ============ STOCK MOVEMENT LOGGING ============

/**
 * Internal helper to log a row to the stock_movements table.
 * Errors are swallowed (logged to console) so a logging failure never aborts
 * the parent transaction.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {object} movementData
 * @param {string} movementData.lot_id
 * @param {'in'|'out'} movementData.movement_type
 * @param {number} movementData.quantity         - Negative for stock-out movements
 * @param {number} movementData.quantity_before
 * @param {number} movementData.quantity_after
 * @param {string} [movementData.notes]
 * @returns {Promise<void>}
 */
async function logStockMovement(supabase, userId, movementData) {
  try {
    const { error } = await supabase.from("stock_movements").insert({
      ...movementData,
      performed_by: userId
    });

    if (error) throw error;
  } catch (error) {
    console.error("Failed to log stock movement:", error);
  }
}

/**
 * Get stock movement history for all lots of a reagent.
 * Joins through the lots table (stock_movements only stores lot_id) and
 * includes the performer's profile data.
 * @param {string} reagentId - Reagent UUID
 * @param {object} [opts]
 * @param {number} [opts.limit=100] - Max movements to return (most recent first)
 * @returns {Promise<{success: boolean, data: object[], errorMessage?: string}>}
 */
export async function getReagentStockHistory(reagentId, { limit = 100 } = {}) {
  return withAuth(async (user, supabase) => {
    // First get all lot IDs for this reagent
    const { data: lots, error: lotsError } = await supabase
      .from("lots")
      .select("id")
      .eq("reagent_id", reagentId);

    if (lotsError) throw lotsError;

    const lotIds = (lots || []).map(l => l.id);
    
    if (lotIds.length === 0) {
      return { success: true, data: [] };
    }

    // Get movements for all lots of this reagent
    const { data, error } = await supabase
      .from("stock_movements")
      .select(`
        *,
        lots (
          lot_number,
          expiry_date
        ),
        profiles:performed_by (
          email,
          full_name
        )
      `)
      .in("lot_id", lotIds)
      .order("performed_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data: data || [] };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error), data: [] }));
}

// ============ ALERTS & STATISTICS ============

/**
 * Get all active reagents where total_quantity <= minimum_stock.
 * Note: column comparison is not supported by PostgREST, so filtering is
 * done client-side after fetching all active reagents.
 * @returns {Promise<{success: boolean, data: object[], errorMessage?: string}>}
 */
export async function getLowStockReagents() {
  return withAuth(async (user, supabase) => {
    const { data, error } = await supabase
      .from("reagents")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;

    // Filter where total_quantity <= minimum_stock
    const lowStockItems = (data || []).filter(r => r.total_quantity <= r.minimum_stock);

    return { success: true, data: lowStockItems };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error), data: [] }));
}


/**
 * Get the number of distinct reagents that have at least one active, non-empty,
 * expired lot (expiry_date < today).
 * @returns {Promise<{success: boolean, count: number, errorMessage?: string}>}
 */
export async function getExpiredLotsCount() {
  return withAuth(async (user, supabase) => {
    const today = new Date().toISOString().split('T')[0];

    // Get expired lots and count unique reagent IDs
    const { data: expiredLots, error } = await supabase
      .from("lots")
      .select("reagent_id")
      .eq("is_active", true)
      .gt("quantity", 0)
      .lt("expiry_date", today);

    if (error) throw error;

    // Count unique reagents with expired lots
    const uniqueReagentIds = [...new Set(expiredLots?.map(l => l.reagent_id) || [])];

    return { success: true, count: uniqueReagentIds.length };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error), count: 0 }));
}

/**
 * Get active, non-empty lots that have expired or will expire within 30 days,
 * joined with their parent reagent's name, reference, and unit.
 * Results are sorted by expiry_date ascending (soonest first).
 * @returns {Promise<{success: boolean, data: object[], errorMessage?: string}>}
 */
export async function getExpiredLots() {
  return withAuth(async (user, supabase) => {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 30);
    const warningDateStr = warningDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from("lots")
      .select(`
        id,
        lot_number,
        expiry_date,
        quantity,
        reagent_id,
        reagents (
          id,
          name,
          reference,
          unit
        )
      `)
      .eq("is_active", true)
      .gt("quantity", 0)
      .not("expiry_date", "is", null)
      .lte("expiry_date", warningDateStr)
      .order("expiry_date", { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error), data: [] }));
}

/**
 * Get sorted unique values for filter dropdowns (supplier, storage_location,
 * sector, machine, category) derived from all active reagents.
 * @returns {Promise<{success: boolean, data: {suppliers: string[], locations: string[], sectors: string[], machines: string[], categories: string[]}, errorMessage?: string}>}
 */
export async function getFilterOptions() {
  return withAuth(async (user, supabase) => {
    const { data, error } = await supabase
      .from("reagents")
      .select("supplier, storage_location, sector, machine, category")
      .eq("is_active", true);

    if (error) throw error;

    // Extract unique values
    const suppliers = [...new Set((data || []).map(r => r.supplier).filter(Boolean))].sort();
    const locations = [...new Set((data || []).map(r => r.storage_location).filter(Boolean))].sort();
    const sectors = [...new Set((data || []).map(r => r.sector).filter(Boolean))].sort();
    const machines = [...new Set((data || []).map(r => r.machine).filter(Boolean))].sort();
    const categories = [...new Set((data || []).map(r => r.category).filter(Boolean))].sort();

    return {
      success: true,
      data: { suppliers, locations, sectors, machines, categories }
    };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error), data: { suppliers: [], locations: [], sectors: [], machines: [], categories: [] } }));
}

/**
 * Get a lot with its parent reagent data by reagent_id + lot_number.
 * Used by the Scanner after decoding a QR code.
 * Returns { reagent, lot } where lot may be null if it doesn't exist yet.
 */
export async function getLotWithReagent(reagentId, lotNumber) {
  return withAuth(async (user, supabase) => {
    // Get the reagent (always needed)
    const { data: reagent, error: reagentError } = await supabase
      .from("reagents")
      .select("*")
      .eq("id", reagentId)
      .eq("is_active", true)
      .single();

    if (reagentError) throw reagentError;

    // Check for existing lot
    const { data: lot, error: lotError } = await supabase
      .from("lots")
      .select("*")
      .eq("reagent_id", reagentId)
      .eq("lot_number", lotNumber)
      .eq("is_active", true)
      .maybeSingle();

    if (lotError) throw lotError;

    return { success: true, data: { reagent, lot } };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}

/**
 * Search reagents by name/reference and/or category for the BarcodeManager.
 * Returns a lightweight list of matching reagents.
 * - query alone: text search (min 1 char)
 * - category alone: browse by category
 * - both: text search scoped to category
 */
export async function searchReagents(query, category) {
  return withAuth(async (user, supabase) => {
    const hasQuery = query && query.length >= 1;
    const hasCategory = !!category;

    if (!hasQuery && !hasCategory) {
      return { success: true, data: [] };
    }

    let dbQuery = supabase
      .from("reagents")
      .select("id, name, reference, category, unit, supplier")
      .eq("is_active", true);

    if (hasCategory) {
      dbQuery = dbQuery.eq("category", category);
    }

    if (hasQuery) {
      const safe = query.replace(/"/g, '\\"');
      const pattern = `"%${safe}%"`;
      dbQuery = dbQuery.or(`name.ilike.${pattern},reference.ilike.${pattern}`);
    }

    const { data, error } = await dbQuery
      .order("name", { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error), data: [] }));
}

/**
 * Check whether an active lot with the given lot_number already exists for a reagent.
 * Used by the BarcodeManager before deciding to show a stock-in vs new-lot form.
 * @param {string} reagentId
 * @param {string} lotNumber
 * @returns {Promise<{success: boolean, exists: boolean, lot: object|null, errorMessage?: string}>}
 */
export async function checkLotExists(reagentId, lotNumber) {
  return withAuth(async (user, supabase) => {
    const { data, error } = await supabase
      .from("lots")
      .select("id, quantity, expiry_date")
      .eq("reagent_id", reagentId)
      .eq("lot_number", lotNumber)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;

    return { success: true, exists: !!data, lot: data };
  }).catch(error => ({ success: false, errorMessage: getErrorMessage(error), exists: false }));
}
