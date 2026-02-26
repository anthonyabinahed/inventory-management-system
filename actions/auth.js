'use server'

import { cache } from "react";
import { createSupabaseClient } from "@/libs/supabase/server";
import { getSupabaseAdmin } from "@/actions/admin";
import { sendEmail } from "@/libs/resend";
import { buildPasswordResetHtml, buildPasswordResetText } from "@/libs/email-templates";
import { getErrorMessage } from "@/libs/utils";
import { loginSchema, forgotPasswordSchema, passwordSchema, validateWithSchema } from "@/libs/schemas";
import config from "@/config";


/**
 * Get the currently authenticated user (cached per request)
 */
export const getCurrentUser = cache(async () => {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
});

/**
 * Sign in with email and password
 */
export async function login(formData) {
    try {
        const validated = validateWithSchema(loginSchema, {
            email: formData.get("email"),
            password: formData.get("password"),
        });
        if (!validated.success) return validated;

        const { email, password } = validated.data;
        const supabase = await createSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Check if user is admin
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

        return { success: true, isAdmin: profile?.role === "admin" };
    } catch (error) {
        return { errorMessage: getErrorMessage(error) };
    }
}

/**
 * Sign out the current user
 */
export async function signOut() {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, errorMessage: "Unauthorized" };
    }
    
    const supabase = await createSupabaseClient();
    await supabase.auth.signOut();
    return { success: true };
}


/**
 * Set session from OAuth tokens (used for invite/reset flows)
 */
export async function setSessionFromTokens(accessToken, refreshToken) {
    try {
        const supabase = await createSupabaseClient();
        const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        });

        if (error) throw error;

        return { user: data?.user, errorMessage: null };
    } catch (error) {
        return { user: null, errorMessage: getErrorMessage(error) };
    }
}

/**
 * Verify an invite token
 */
export async function verifyInviteToken(tokenHash) {
    try {
        const supabase = await createSupabaseClient();
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "invite",
        });

        if (error) throw error;

        return { user: data?.user, errorMessage: null };
    } catch (error) {
        return { user: null, errorMessage: getErrorMessage(error) };
    }
}

/**
 * Update the current user's password (requires authentication)
 */
export async function updatePassword(password) {
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
        return { success: false, errorMessage: parsed.error.issues[0]?.message || "Invalid password" };
    }

    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, errorMessage: "Unauthorized" };
        }

        const supabase = await createSupabaseClient();
        const { error } = await supabase.auth.updateUser({ password: parsed.data });

        if (error) throw error;

        return { success: true, errorMessage: null };
    } catch (error) {
        return { success: false, errorMessage: getErrorMessage(error) };
    }
}

/**
 * Request a password reset email
 * Uses admin client to generate a recovery link and sends custom email
 */
export async function requestPasswordReset(email) {
    const validated = validateWithSchema(forgotPasswordSchema, { email });
    if (!validated.success) return validated;

    try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
        const supabaseAdmin = await getSupabaseAdmin();

        // Generate password recovery link
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: email,
            options: {
                redirectTo: `${siteUrl}${config.routes.resetPassword}`,
            },
        });

        if (error) {
            console.error("Password reset link generation error:", error);
            // Don't reveal if user exists or not for security
            return { success: true, errorMessage: null };
        }

        const resetUrl = data.properties?.action_link;

        if (!resetUrl) {
            throw new Error("Failed to generate reset link");
        }

        // Send custom email via Resend
        await sendEmail({
            to: email,
            subject: `Reset your ${config.appName} password`,
            html: buildPasswordResetHtml({ resetUrl }),
            text: buildPasswordResetText({ resetUrl }),
        });

        return { success: true, errorMessage: null };
    } catch (error) {
        console.error("Password reset error:", error);
        // Don't reveal specific errors for security
        return { success: true, errorMessage: null };
    }
}
