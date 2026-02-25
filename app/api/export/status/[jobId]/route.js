import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/libs/supabase/server";

export async function GET(request, { params }) {
  const supabase = await createSupabaseClient();

  // Auth guard
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  // Fetch the job — RLS ensures users can only see their own jobs
  const { data: job, error: jobError } = await supabase
    .from("export_jobs")
    .select("id, status, file_path, error_message, created_at, completed_at")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // If completed, generate a signed download URL (1-hour expiry)
  if (job.status === "completed" && job.file_path) {
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("exports")
      .createSignedUrl(job.file_path, 3600);

    if (urlError) {
      console.error("Failed to generate signed URL:", urlError);
      return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
    }

    return NextResponse.json({
      status: job.status,
      downloadUrl: signedUrlData.signedUrl,
    });
  }

  return NextResponse.json({
    status: job.status,
    errorMessage: job.error_message ?? null,
  });
}
