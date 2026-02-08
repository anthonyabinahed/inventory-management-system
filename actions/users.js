'use server'

import { withAuth } from "@/libs/auth";
import { getErrorMessage } from "@/libs/utils";

// ============ USER ACTIONS ============

/**
 * Get all users/profiles (requires authentication)
 */
export async function getAllUsers() {
    return withAuth(async (user, supabase) => {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    }).catch(error => ({ success: false, errorMessage: getErrorMessage(error), data: [] }));
}

/**
 * Get a user's profile by ID (requires authentication)
 */
export async function getUserProfile(userId) {
    return withAuth(async (user, supabase) => {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (error) throw error;
        return { success: true, data };
    }).catch(error => ({ success: false, errorMessage: getErrorMessage(error) }));
}
