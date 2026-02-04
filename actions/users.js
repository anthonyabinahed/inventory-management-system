'use server'

import { createSupabaseClient } from "@/libs/supabase/server";

/**
 * Get all users/profiles
 */
export async function getAllUsers() {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get a user's profile by ID
 */
export async function getUserProfile(userId) {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) throw error;
    return data;
}
