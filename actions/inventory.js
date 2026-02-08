'use server'

import { createSupabaseClient } from "@/libs/supabase/server";
import { getCurrentUser } from "@/actions/auth";
import { getErrorMessage } from "@/libs/utils";

// ============ REAGENT CRUD OPERATIONS ============

/**
 * Get all reagents with optional filtering and pagination
 * Returns master reagent data with total_quantity (aggregated from lots)
 */
export async function getReagents({
  page = 1,
  limit = 25,
  filters = {}
} = {}) {
  try {
    const supabase = await createSupabaseClient();

    // If filtering by hasExpiredLots, first get reagent IDs with expired lots
    let expiredReagentIds = null;
    if (filters.hasExpiredLots) {
      const today = new Date().toISOString().split('T')[0];
      const { data: expiredLots, error: expiredError } = await supabase
        .from("lots")
        .select("reagent_id")
        .eq("is_active", true)
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

    let query = supabase
      .from("reagents")
      .select("*", { count: 'exact' })
      .eq("is_active", true);

    // Filter by expired reagent IDs if applicable
    if (expiredReagentIds) {
      query = query.in("id", expiredReagentIds);
    }

    // Apply filters
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
      query = query.or(`name.ilike.%${filters.search}%,internal_barcode.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Apply sorting (always alphabetical by name) and pagination
    const offset = (page - 1) * limit;
    query = query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Client-side filter for low stock (column comparison not supported in Supabase)
    let filteredData = data || [];
    if (filters.lowStock) {
      filteredData = filteredData.filter(r => r.total_quantity <= r.minimum_stock);
    }

    const needsClientFilter = filters.lowStock;
    const totalCount = needsClientFilter ? filteredData.length : (count || 0);

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
  } catch (error) {
    return { success: false, errorMessage: getErrorMessage(error), data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } };
  }
}

/**
 * Get a single reagent by ID
 */
export async function getReagentById(id) {
  try {
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from("reagents")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return { success: false, errorMessage: getErrorMessage(error) };
  }
}

/**
 * Create a new reagent (master data only)
 * New reagents start with total_quantity = 0
 */
export async function createReagent(reagentData) {
  try {
    // TODO: isn't there a way to have this check for all server actions here? dependency injection or smthg? 
    // all server actions need it
    const user = await getCurrentUser();
    if (!user) return { success: false, errorMessage: "Unauthorized" };

    const supabase = await createSupabaseClient();

    // Only include master-level fields
    const { data, error } = await supabase
      .from("reagents")
      .insert({
        name: reagentData.name,
        internal_barcode: reagentData.internal_barcode,
        description: reagentData.description || null,
        supplier: reagentData.supplier,
        storage_location: reagentData.storage_location,
        storage_temperature: reagentData.storage_temperature,
        sector: reagentData.sector,
        machine: reagentData.machine || null,
        minimum_stock: reagentData.minimum_stock || 0,
        unit: reagentData.unit || 'units',
        total_quantity: 0,  // Starts empty, updated via lots
        created_by: user.id,
        updated_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return { success: false, errorMessage: getErrorMessage(error) };
  }
}

/**
 * Update an existing reagent (master data only)
 */
export async function updateReagent(id, updates) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, errorMessage: "Unauthorized" };

    const supabase = await createSupabaseClient();

    // Only allow master-level fields to be updated
    const safeUpdates = {};
    const allowedFields = [
      // TODO: refactor these fields in an enum somewhere
      'name', 'internal_barcode', 'description', 'supplier',
      'storage_location', 'storage_temperature', 'sector', 'machine',
      'minimum_stock', 'unit'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field];
      }
    }

    const { data, error } = await supabase
      .from("reagents")
      .update({
        ...safeUpdates,
        updated_by: user.id
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return { success: false, errorMessage: getErrorMessage(error) };
  }
}

/**
 * Soft delete a reagent (and its lots via cascade)
 */
export async function deleteReagent(id) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, errorMessage: "Unauthorized" };

    const supabase = await createSupabaseClient();

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

    return { success: true };
  } catch (error) {
    return { success: false, errorMessage: getErrorMessage(error) };
  }
}

// ============ LOT OPERATIONS ============

/**
 * Get all lots for a reagent
 */
export async function getLotsForReagent(reagentId, { includeEmpty = true, includeInactive = false } = {}) {
  try {
    const supabase = await createSupabaseClient();

    let query = supabase
      .from("lots")
      .select("*")
      .eq("reagent_id", reagentId)
      .order("expiry_date", { ascending: true });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    if (!includeEmpty) {
      query = query.gt("quantity", 0);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, errorMessage: getErrorMessage(error), data: [] };
  }
}

/**
 * Stock In - Add stock to existing lot or create new lot
 * If lot_number exists for reagent, adds to quantity (keeps original expiry)
 * If new lot_number, creates new lot record
 */
export async function stockIn({
  reagent_id,
  lot_number,
  quantity,
  expiry_date,
  date_of_reception,
  notes
}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, errorMessage: "Unauthorized" };

    if (quantity <= 0) {
      return { success: false, errorMessage: "Quantity must be greater than 0" };
    }

    const supabase = await createSupabaseClient();

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
      // TODO: refactor this method, duplicated code
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
      await logStockMovement({
        reagent_id,
        lot_id: existingLot.id,
        movement_type: 'in',
        quantity,
        quantity_before: existingLot.quantity,
        quantity_after: newQuantity,
        lot_number,
        expiry_date: existingLot.expiry_date,
        notes
      });
    } else {
      // Create new lot
      if (!expiry_date) {
        return { success: false, errorMessage: "Expiry date is required for new lots" };
      }

      const { data, error } = await supabase
        .from("lots")
        .insert({
          reagent_id,
          lot_number,
          quantity,
          expiry_date,
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
      await logStockMovement({
        reagent_id,
        lot_id: data.id,
        movement_type: 'in',
        quantity,
        quantity_before: 0,
        quantity_after: quantity,
        lot_number,
        expiry_date,
        notes: notes || 'New lot created'
      });
    }

    return { success: true, data: lot, action };
  } catch (error) {
    return { success: false, errorMessage: getErrorMessage(error) };
  }
}

/**
 * Stock Out - Remove stock from a specific lot
 */
export async function stockOut(lotId, quantity, { notes } = {}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, errorMessage: "Unauthorized" };

    if (quantity <= 0) {
      return { success: false, errorMessage: "Quantity must be greater than 0" };
    }

    const supabase = await createSupabaseClient();

    // Get current lot
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
    await logStockMovement({
      reagent_id: lot.reagent_id,
      lot_id: lotId,
      movement_type: 'out',
      quantity: -quantity,  // Negative for out
      quantity_before: lot.quantity,
      quantity_after: newQuantity,
      lot_number: lot.lot_number,
      expiry_date: lot.expiry_date,
      notes
    });

    return { success: true, newQuantity };
  } catch (error) {
    return { success: false, errorMessage: getErrorMessage(error) };
  }
}


/**
 * Soft delete a lot
 */
export async function deleteLot(lotId) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, errorMessage: "Unauthorized" };

    const supabase = await createSupabaseClient();

    const { error } = await supabase
      .from("lots")
      .update({ is_active: false, updated_by: user.id })
      .eq("id", lotId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return { success: false, errorMessage: getErrorMessage(error) };
  }
}

// ============ STOCK MOVEMENT LOGGING ============

/**
 * Internal helper to log stock movements
 */
async function logStockMovement(movementData) {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const supabase = await createSupabaseClient();

    const { error } = await supabase.from("stock_movements").insert({
      ...movementData,
      performed_by: user.id
    });

    if (error) throw error;
  } catch (error) {
    console.error("Failed to log stock movement:", error);
  }
}

/**
 * Get stock movement history for all lots of a reagent
 */
export async function getReagentStockHistory(reagentId, { limit = 100 } = {}) {
  try {
    const supabase = await createSupabaseClient();
    // TODO check this method
    const { data, error } = await supabase
      .from("stock_movements")
      .select(`
        *,
        profiles:performed_by (
          email,
          full_name
        )
      `)
      .eq("reagent_id", reagentId)
      .order("performed_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, errorMessage: getErrorMessage(error), data: [] };
  }
}

// ============ ALERTS & STATISTICS ============

/**
 * Get reagents with low stock (total_quantity <= minimum_stock)
 */
export async function getLowStockReagents() {
  try {
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from("reagents")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;

    // Filter where total_quantity <= minimum_stock
    const lowStockItems = (data || []).filter(r => r.total_quantity <= r.minimum_stock);

    return { success: true, data: lowStockItems };
  } catch (error) {
    return { success: false, errorMessage: getErrorMessage(error), data: [] };
  }
}


/**
 * Get count of lots that are already expired
 */
export async function getExpiredLotsCount() {
  try {
    const supabase = await createSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    const { count, error } = await supabase
      .from("lots")
      .select("id", { count: 'exact', head: true }) // TODO: what's this head true? 
      .eq("is_active", true)
      .gt("quantity", 0)
      .lt("expiry_date", today);

    if (error) throw error;

    return { success: true, count: count || 0 };
  } catch (error) {
    return { success: false, errorMessage: getErrorMessage(error), count: 0 };
  }
}

/**
 * Get filter options (unique values for dropdowns)
 */
export async function getFilterOptions() {
  try {
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from("reagents")
      .select("supplier, storage_location")
      .eq("is_active", true);

    if (error) throw error;

    // Extract unique values
    const suppliers = [...new Set((data || []).map(r => r.supplier).filter(Boolean))].sort();
    const locations = [...new Set((data || []).map(r => r.storage_location).filter(Boolean))].sort();
    // TODO: add machines as well as sectors
    return {
      success: true,
      data: { suppliers, locations }
    };
  } catch (error) {
    return { success: false, errorMessage: getErrorMessage(error), data: { suppliers: [], locations: [] } };
  }
}

/**
 * Check if a lot number exists for a reagent
 */
export async function checkLotExists(reagentId, lotNumber) {
  try {
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from("lots")
      .select("id, quantity, expiry_date")
      .eq("reagent_id", reagentId)
      .eq("lot_number", lotNumber)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;

    return { success: true, exists: !!data, lot: data };
  } catch (error) {
    return { success: false, errorMessage: getErrorMessage(error), exists: false };
  }
}
