'use server'

import { createSupabaseClient } from "@/libs/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendEmail } from "@/libs/resend";
import { getErrorMessage } from "@/libs/utils";
import config from "@/config";

/**
 * Update a user's role
 */
export async function updateUserRole(userId, newRole) {
    const supabase = await createSupabaseClient();
    const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

    if (error) throw error;
    return { success: true };
}

/**
 * Creates a Supabase admin client with service role key.
 * This client bypasses RLS and can manage users.
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
 * Verifies the current user is an admin
 */
export async function verifyAdmin() {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { isAdmin: false, user: null, error: "Unauthorized" };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        return { isAdmin: false, user, error: "Forbidden: Admin access required" };
    }

    return { isAdmin: true, user, error: null };
}

/**
 * Invite a new user (admin only)
 */
export async function inviteUser(email, fullName = "", role = "user") {
    try {
        // Verify requester is admin
        const { isAdmin, error: authError } = await verifyAdmin();

        if (!isAdmin) {
            return { success: false, errorMessage: authError };
        }

        if (!email) {
            return { success: false, errorMessage: "Email is required" };
        }

        if (!["admin", "user"].includes(role)) {
            return { success: false, errorMessage: "Invalid role. Must be 'admin' or 'user'" };
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
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #570df8; margin-bottom: 10px;">${config.appName}</h1>
                    </div>

                    <h2 style="color: #333;">You're Invited!</h2>

                    <p>Hello${fullName ? ` ${fullName}` : ""},</p>

                    <p>You've been invited to join the <strong>${config.appName}</strong> platform.</p>

                    <p>Click the button below to set your password and get started:</p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${inviteUrl}"
                           style="display: inline-block; padding: 14px 32px; background-color: #570df8; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Accept Invitation
                        </a>
                    </div>

                    <p style="color: #666; font-size: 14px;">
                        This invitation link will expire in 24 hours.
                    </p>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

                    <p style="color: #999; font-size: 12px; text-align: center;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="${inviteUrl}" style="color: #570df8; word-break: break-all;">${inviteUrl}</a>
                    </p>
                </body>
                </html>
            `,
            text: `You've been invited to ${config.appName}!\n\nHello${fullName ? ` ${fullName}` : ""},\n\nClick this link to set your password and get started:\n${inviteUrl}\n\nThis invitation link will expire in 24 hours.`,
        });

        return { success: true, userId: data.user?.id, errorMessage: null };
    } catch (error) {
        console.error("Invite user error:", error);
        return { success: false, errorMessage: getErrorMessage(error) };
    }
}

/**
 * Revoke a user's access (admin only)
 */
export async function revokeUser(userId) {
    try {
        const { isAdmin, error: authError } = await verifyAdmin();

        if (!isAdmin) {
            return { success: false, errorMessage: authError };
        }

        const supabaseAdmin = await getSupabaseAdmin();
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) throw error;

        return { success: true, errorMessage: null };
    } catch (error) {
        console.error("Revoke user error:", error);
        return { success: false, errorMessage: getErrorMessage(error) };
    }
}
