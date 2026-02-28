'use server'

import { cache } from "react";
import { createSupabaseClient } from "@/libs/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendEmail } from "@/libs/resend";
import { buildInviteHtml, buildInviteText } from "@/libs/email-templates";
import { getErrorMessage } from "@/libs/utils";
import { inviteUserSchema, updateUserRoleSchema, updateEmailAlertSchema, validateWithSchema } from "@/libs/schemas";
import config from "@/config";
import { getCurrentUser } from "@/actions/auth";
import { logAuditEvent } from "@/libs/audit";

// ============ HELPER FUNCTIONS ============

/**
 * Creates a Supabase admin client with service role key.
 * This client bypasses RLS and can manage users.
 * Exported for use in auth.js for password reset flows.
 * Note: Should only be used in server-side code for admin operations.
 */

export async function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error("Missing Supabase configuration for admin operations");
    }

    return createAdminClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}


/**
 * Verifies the current user is an admin (cached per request)
 * Used by layout for UI display and internally for admin action authorization.
 */
export const verifyAdmin = cache(async () => {
    const user = await getCurrentUser();

    if (!user) {
        return { isAdmin: false, user: null, error: "Unauthorized" };
    }

    const supabase = await createSupabaseClient();
    const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .single();

    if (!profile?.is_active) {
        return { isAdmin: false, user, error: "Account deactivated" };
    }

    if (profile?.role !== "admin") {
        return { isAdmin: false, user, error: "Forbidden: Admin access required" };
    }

    return { isAdmin: true, user, error: null };
});

// ============ ADMIN ACTIONS ============

/**
 * Update a user's role (admin only)
 */
export async function updateUserRole(userId, newRole) {
    const validated = validateWithSchema(updateUserRoleSchema, { userId, role: newRole });
    if (!validated.success) return validated;

    try {
        const { isAdmin, user, error: authError } = await verifyAdmin();

        if (!isAdmin) {
            return { success: false, errorMessage: authError };
        }

        const supabase = await createSupabaseClient();
        const { error } = await supabase
            .from("profiles")
            .update({ role: newRole })
            .eq("id", userId);

        if (error) throw error;

        await logAuditEvent(supabase, user.id, {
            action: 'update_user_role',
            resourceType: 'user',
            resourceId: userId,
            description: `Changed user role to "${newRole}"`,
        });

        return { success: true };
    } catch (error) {
        return { success: false, errorMessage: getErrorMessage(error) };
    }
}


/**
 * Update a user's email alert preference (admin only)
 */
export async function updateEmailAlertPreference(userId, receiveEmailAlerts) {
    const validated = validateWithSchema(updateEmailAlertSchema, { userId, receiveEmailAlerts });
    if (!validated.success) return validated;

    try {
        const { isAdmin, user, error: authError } = await verifyAdmin();

        if (!isAdmin) {
            return { success: false, errorMessage: authError };
        }

        const supabase = await createSupabaseClient();
        const { error } = await supabase
            .from("profiles")
            .update({ receive_email_alerts: receiveEmailAlerts })
            .eq("id", userId);

        if (error) throw error;

        await logAuditEvent(supabase, user.id, {
            action: 'update_email_alerts',
            resourceType: 'user',
            resourceId: userId,
            description: `${receiveEmailAlerts ? 'Enabled' : 'Disabled'} email alerts for user`,
        });

        return { success: true };
    } catch (error) {
        return { success: false, errorMessage: getErrorMessage(error) };
    }
}

/**
 * Invite a new user (admin only)
 */
export async function inviteUser(email, fullName = "", role = "user") {
    const validated = validateWithSchema(inviteUserSchema, { email, fullName, role });
    if (!validated.success) return validated;

    try {
        // Verify requester is admin
        const { isAdmin, user, error: authError } = await verifyAdmin();

        if (!isAdmin) {
            return { success: false, errorMessage: authError };
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
        const supabaseAdmin = await getSupabaseAdmin();

        // Generate invitation link
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: "invite",
            email: email,
            options: {
                redirectTo: `${siteUrl}/accept-invite`,
                data: {
                    role: role,
                    full_name: fullName || "",
                },
            },
        });

        if (error) {
            if (error.message.includes("already been registered")) {
                return { success: false, errorMessage: "A user with this email already exists" };
            }
            throw error;
        }

        const inviteUrl = data.properties?.action_link;

        if (!inviteUrl) {
            throw new Error("Failed to generate invitation link");
        }

        // Send custom email via Resend
        await sendEmail({
            to: email,
            subject: `You've been invited to ${config.appName}`,
            html: buildInviteHtml({ fullName, inviteUrl }),
            text: buildInviteText({ fullName, inviteUrl }),
        });

        const supabase = await createSupabaseClient();
        await logAuditEvent(supabase, user.id, {
            action: 'invite_user',
            resourceType: 'user',
            resourceId: data.user?.id,
            description: `Invited user "${email}"`,
        });

        return { success: true, userId: data.user?.id, errorMessage: null };
    } catch (error) {
        console.error("Invite user error:", error);
        return { success: false, errorMessage: getErrorMessage(error) };
    }
}

/**
 * Deactivate a user's access (admin only)
 * Soft-deletes by banning in Auth and marking profile inactive.
 * Preserves audit trail and stock movement history.
 *
 * Uses a hybrid transaction strategy:
 * - Auth ban (GoTrue API) runs first (non-transactional)
 * - DB operations (profile update, export cancellation, audit log) run
 *   in a single atomic RPC transaction
 * - If the DB transaction fails, the Auth ban is rolled back (compensating action)
 */
export async function revokeUser(userId) {
    try {
        const { isAdmin, user, error: authError } = await verifyAdmin();

        if (!isAdmin) {
            return { success: false, errorMessage: authError };
        }

        const supabaseAdmin = await getSupabaseAdmin();

        // 1. Ban the user in Supabase Auth (~100 years = effectively permanent)
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            ban_duration: '876000h',
        });
        if (banError) throw banError;

        // 2. Atomic DB transaction: profile update + export cancellation + audit log
        const { error: rpcError } = await supabaseAdmin.rpc('deactivate_user_tx', {
            target_user_id: userId,
            admin_user_id: user.id,
        });

        if (rpcError) {
            // Compensating action: unban to restore consistent state
            await supabaseAdmin.auth.admin.updateUserById(userId, {
                ban_duration: 'none',
            });
            throw rpcError;
        }

        return { success: true, errorMessage: null };
    } catch (error) {
        console.error("Deactivate user error:", error);
        return { success: false, errorMessage: getErrorMessage(error) };
    }
}

/**
 * Reactivate a deactivated user (admin only)
 * Unbans in Auth and marks profile active.
 *
 * Uses the same hybrid transaction strategy as revokeUser():
 * - Auth unban first, then atomic DB transaction
 * - If DB fails, re-ban to restore consistent state
 */
export async function reactivateUser(userId) {
    try {
        const { isAdmin, user, error: authError } = await verifyAdmin();

        if (!isAdmin) {
            return { success: false, errorMessage: authError };
        }

        const supabaseAdmin = await getSupabaseAdmin();

        // 1. Unban the user in Supabase Auth
        const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            ban_duration: 'none',
        });
        if (unbanError) throw unbanError;

        // 2. Atomic DB transaction: profile update + audit log
        const { error: rpcError } = await supabaseAdmin.rpc('reactivate_user_tx', {
            target_user_id: userId,
            admin_user_id: user.id,
        });

        if (rpcError) {
            // Compensating action: re-ban to restore consistent state
            await supabaseAdmin.auth.admin.updateUserById(userId, {
                ban_duration: '876000h',
            });
            throw rpcError;
        }

        return { success: true, errorMessage: null };
    } catch (error) {
        console.error("Reactivate user error:", error);
        return { success: false, errorMessage: getErrorMessage(error) };
    }
}
