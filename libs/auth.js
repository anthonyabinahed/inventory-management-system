

import { getCurrentUser } from "@/actions/auth";
import { createSupabaseClient } from "@/libs/supabase/server";

/**
 * Wrapper for server actions that require authentication.
 * Handles auth check and provides user + supabase client to the action.
 * 
 * @param {Function} actionFn - Async function that receives (user, supabase) as arguments
 * @returns {Promise} - Result of actionFn or error object if unauthorized
 * 
 * @example
 * export async function myServerAction(data) {
 *   return withAuth(async (user, supabase) => {
 *     // user is guaranteed to exist here
 *     // supabase client is ready to use
 *     const { data, error } = await supabase.from("table").select("*");
 *     if (error) throw error;
 *     return { success: true, data };
 *   }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
 * }
 */
export async function withAuth(actionFn) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, errorMessage: "Unauthorized" };
  }
  
  const supabase = await createSupabaseClient();
  return actionFn(user, supabase);
}