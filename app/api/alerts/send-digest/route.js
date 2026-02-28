import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/libs/resend";
import { fetchLowStockReagents, fetchExpiringLots } from "@/libs/queries";
import { getStockStatus } from "@/libs/constants";
import { buildAlertDigestHtml, buildAlertDigestText } from "@/libs/email-templates";

/**
 * GET /api/alerts/send-digest
 *
 * Invoked daily by Vercel Cron at 07:00 UTC.
 * Sends a digest email to all users with receive_email_alerts = true.
 */
export async function GET(request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // 1. Get users who opted in
    const { data: subscribers, error: subError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("receive_email_alerts", true)
      .eq("is_active", true);

    if (subError) throw subError;

    if (!subscribers?.length) {
      return NextResponse.json({ message: "No subscribers", sent: 0 });
    }

    // 2. Gather alert data (shared across all users — same inventory)
    const lowStockReagents = await fetchLowStockReagents(supabase);
    const expiringLots = await fetchExpiringLots(supabase);

    const today = new Date().toISOString().split("T")[0];

    const outOfStockItems = lowStockReagents.filter(
      r => getStockStatus(r.total_quantity, r.minimum_stock).status === "out"
    );
    const lowStockItems = lowStockReagents.filter(
      r => getStockStatus(r.total_quantity, r.minimum_stock).status === "low"
    );
    const expiredLots = expiringLots.filter(l => l.expiry_date < today);
    const expiringSoonLots = expiringLots.filter(l => l.expiry_date >= today);

    const totalAlerts = outOfStockItems.length + lowStockItems.length +
      expiredLots.length + expiringSoonLots.length;

    if (totalAlerts === 0) {
      return NextResponse.json({ message: "No alerts to send", sent: 0 });
    }

    // 3. Send to each subscriber (with per-day dedup)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    let sentCount = 0;

    for (const user of subscribers) {
      // Dedup: skip if already sent today
      const { data: recentSend } = await supabase
        .from("alert_notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("email_status", "sent")
        .gte("sent_at", todayStart.toISOString())
        .limit(1)
        .maybeSingle();

      if (recentSend) continue;

      const alertSummary = {
        low_stock_count: lowStockItems.length,
        out_of_stock_count: outOfStockItems.length,
        expired_count: expiredLots.length,
        expiring_soon_count: expiringSoonLots.length,
      };

      try {
        const html = buildAlertDigestHtml({
          userName: user.full_name,
          outOfStockItems,
          lowStockItems,
          expiredLots,
          expiringSoonLots,
          siteUrl,
        });

        const text = buildAlertDigestText({
          userName: user.full_name,
          outOfStockItems,
          lowStockItems,
          expiredLots,
          expiringSoonLots,
          siteUrl,
        });

        await sendEmail({
          to: user.email,
          subject: `[Anamed] Daily Inventory Alert — ${totalAlerts} item${totalAlerts === 1 ? '' : 's'} need attention`,
          html,
          text,
        });

        await supabase.from("alert_notifications").insert({
          user_id: user.id,
          alert_summary: alertSummary,
          email_status: "sent",
        });

        sentCount++;
      } catch (err) {
        console.error(`Failed to send alert to ${user.email}:`, err);

        await supabase.from("alert_notifications").insert({
          user_id: user.id,
          alert_summary: alertSummary,
          email_status: "failed",
          error_message: err.message,
        });
      }
    }

    return NextResponse.json({ success: true, sent: sentCount, totalAlerts });
  } catch (error) {
    console.error("Alert digest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
