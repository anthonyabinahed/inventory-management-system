import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/libs/supabase/server";
import { validateWithSchema, exportOptionsSchema } from "@/libs/schemas";

export async function POST(request) {
  const supabase = await createSupabaseClient();

  // Auth guard
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate export options
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const validated = validateWithSchema(exportOptionsSchema, body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.errorMessage }, { status: 400 });
  }

  const options = validated.data;

  // Create the export job record
  const { data: job, error: insertError } = await supabase
    .from("export_jobs")
    .insert({
      user_id: user.id,
      status: "pending",
      options,
    })
    .select("id")
    .single();

  if (insertError || !job) {
    console.error("Failed to create export job:", insertError);
    return NextResponse.json({ error: "Failed to create export job" }, { status: 500 });
  }

  // Invoke the Edge Function asynchronously — fire and forget.
  // We don't await the result; the function updates the job record when done.
  const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-export`;
  fetch(edgeFunctionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Service role key: server-side only, never exposed to clients.
      // Supabase gateway accepts it with verify_jwt=true (default) and restricts
      // direct invocation to trusted server-side code only.
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ jobId: job.id }),
  }).catch(err => {
    // Log invocation failure — job will remain in 'pending' state
    console.error("Failed to invoke process-export Edge Function:", err);
  });

  return NextResponse.json({ success: true, jobId: job.id }, { status: 202 });
}
