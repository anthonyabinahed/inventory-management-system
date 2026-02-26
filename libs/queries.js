/**
 * Shared DB query helpers.
 * These accept a supabase client parameter so they can be used by both
 * withAuth-protected server actions and the API route (service-role client).
 *
 * This file has NO "use server" directive — these are plain functions,
 * not exposed as callable server actions.
 */

/**
 * Fetch all active reagents where total_quantity <= minimum_stock.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<object[]>}
 */
export async function fetchLowStockReagents(supabase) {
  const { data, error } = await supabase
    .from("reagents")
    .select("*")
    .eq("is_active", true);

  if (error) throw error;

  return (data || []).filter(r => r.total_quantity <= r.minimum_stock);
}

/**
 * Fetch active, non-empty lots that have expired or will expire within 30 days,
 * joined with their parent reagent's name, reference, and unit.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<object[]>}
 */
export async function fetchExpiringLots(supabase) {
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

  return data || [];
}
