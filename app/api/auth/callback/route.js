import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/libs/supabase/server";
import config from "@/config";

export const dynamic = "force-dynamic";

/**
 * AUTH CALLBACK ROUTE
 * ====================
 * This route handles Supabase auth callbacks for invite and password recovery links.
 *
 * WHEN IS THIS CALLED?
 * --------------------
 * 1. Invite Links (admin invites user)
 *    - Admin invites user via inviteUser() server action
 *    - User clicks link in email
 *    - Supabase redirects here: /api/auth/callback?token_hash=xxx&type=invite
 *    - We verify the token → create session → redirect to /accept-invite
 *
 * 2. Password Recovery (forgot password)
 *    - User requests password reset via requestPasswordReset() server action
 *    - User clicks link in email
 *    - Supabase redirects here: /api/auth/callback?token_hash=xxx&type=recovery
 *    - We verify the token → create session → redirect to /reset-password
 */
export async function GET(req) {
  const requestUrl = new URL(req.url);

  // Extract auth parameters from the URL
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const error = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");

  console.log("=== AUTH CALLBACK ===");
  console.log("Type:", type);
  console.log("Has token_hash:", !!token_hash);
  console.log("Error:", error);

  // Handle errors passed from Supabase
  if (error) {
    console.error("Supabase error:", error, error_description);
    return NextResponse.redirect(
      `${requestUrl.origin}${config.routes.login}?error=${encodeURIComponent(error_description || error)}`
    );
  }

  // Verify token_hash for invite or recovery flows
  if (token_hash && type) {
    // TODO: Delete after checking this log and all unecessary console logs
    console.log(`Verifying ${type} token...`);

    const supabase = await createSupabaseClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (error) {
      console.error(`Failed to verify ${type} token:`, error.message);

      if (type === "invite") {
        return NextResponse.redirect(
          `${requestUrl.origin}${config.routes.acceptInvite}?error=${encodeURIComponent(error.message)}`
        );
      }
      if (type === "recovery") {
        return NextResponse.redirect(
          `${requestUrl.origin}${config.routes.resetPassword}?error=${encodeURIComponent(error.message)}`
        );
      }
      return NextResponse.redirect(
        `${requestUrl.origin}${config.routes.login}?error=${encodeURIComponent(error.message)}`
      );
    }

    console.log("Token verified for user:", data.user?.email);

    // Redirect to appropriate page
    if (type === "invite") {
      console.log("→ Redirecting to accept-invite page");
      return NextResponse.redirect(`${requestUrl.origin}${config.routes.acceptInvite}`);
    }
    if (type === "recovery") {
      console.log("→ Redirecting to reset-password page");
      return NextResponse.redirect(`${requestUrl.origin}${config.routes.resetPassword}`);
    }
  }

  // Fallback: no valid parameters
  console.log("No valid auth parameters, redirecting to login");
  return NextResponse.redirect(`${requestUrl.origin}${config.routes.login}`);
}
