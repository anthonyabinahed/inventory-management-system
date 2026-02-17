/**
 * Audit logging utility.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {{ action: string, resourceType: string, resourceId?: string, description: string }} event
 */
export async function logAuditEvent(supabase, userId, { action, resourceType, resourceId, description }) {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      action,
      resource_type: resourceType,
      resource_id: resourceId || null,
      description,
      user_id: userId,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}
