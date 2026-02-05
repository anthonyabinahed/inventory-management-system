'use server'

import { cache } from "react";
import { createSupabaseClient } from "@/libs/supabase/server";
import { getSupabaseAdmin } from "@/actions/admin";
import { sendEmail } from "@/libs/resend";
import { getErrorMessage } from "@/libs/utils";
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
        const email = formData.get("email");
        const password = formData.get("password");

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
    const supabase = await createSupabaseClient();
    await supabase.auth.signOut();
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
 * Update the current user's password
 */
export async function updatePassword(password) {
    try {
        const supabase = await createSupabaseClient();
        const { error } = await supabase.auth.updateUser({ password });

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
    try {
        if (!email) {
            return { success: false, errorMessage: "Email is required" };
        }

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
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: ${config.colors.main}; margin-bottom: 10px;">${config.appName}</h1>
                    </div>

                    <h2 style="color: #333;">Reset Your Password</h2>

                    <p>Hello,</p>

                    <p>We received a request to reset your password for your <strong>${config.appName}</strong> account.</p>

                    <p>Click the button below to set a new password:</p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}"
                           style="display: inline-block; padding: 14px 32px; background-color: ${config.colors.main}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Reset Password
                        </a>
                    </div>

                    <p style="color: #666; font-size: 14px;">
                        This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.
                    </p>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

                    <p style="color: #999; font-size: 12px; text-align: center;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="${resetUrl}" style="color: ${config.colors.main}; word-break: break-all;">${resetUrl}</a>
                    </p>
                </body>
                </html>
            `,
            text: `Reset Your Password\n\nHello,\n\nWe received a request to reset your password for your ${config.appName} account.\n\nClick this link to set a new password:\n${resetUrl}\n\nThis link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.`,
        });

        return { success: true, errorMessage: null };
    } catch (error) {
        console.error("Password reset error:", error);
        // Don't reveal specific errors for security
        return { success: true, errorMessage: null };
    }
}
